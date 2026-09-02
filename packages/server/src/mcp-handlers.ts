import type { KitsuneEngine } from '@kitsuneos/core';
import { recordUsageEvent } from '@kitsuneos/core';
import { KitsuneError } from '@kitsuneos/core';
import { TOOL_DEFINITIONS } from '@kitsuneos/mcp/schemas';
import { invokeMcpTool, isKitsuneError } from '@kitsuneos/mcp/invoke';
import { auditAuthFailure, resolveCredential } from './resolve-credential.js';
import { checkRateLimit } from './rate-limit.js';

export interface McpHttpResult {
  status: number;
  body: Record<string, unknown>;
}

function workspaceInjection(args: Record<string, unknown> | undefined): boolean {
  return (
    'workspaceId' in (args ?? {}) ||
    'workspace_id' in (args ?? {}) ||
    'workspace' in (args ?? {})
  );
}

/** Shared MCP HTTP handler for Node http.Server and Next.js route handlers. */
export async function handleMcpHttpRequest(
  engine: KitsuneEngine,
  method: string,
  pathname: string,
  authorization: string | null | undefined,
  rawBody: string,
): Promise<McpHttpResult> {
  const authHeader = authorization ?? undefined;

  if (method === 'GET' && pathname === '/health') {
    return { status: 200, body: { ok: true } };
  }

  if (method === 'GET' && pathname === '/mcp/tools') {
    try {
      const credential = await resolveCredential(engine, authHeader);
      if (!checkRateLimit(credential.keyId)) {
        return { status: 429, body: { error: 'rate_limited', message: 'Too many requests' } };
      }
    } catch (error) {
      await auditAuthFailure(
        engine,
        authHeader,
        error instanceof KitsuneError ? error.message : 'auth failed',
      );
      return { status: 401, body: { error: 'forbidden', message: 'Invalid API key' } };
    }
    return { status: 200, body: { tools: TOOL_DEFINITIONS } };
  }

  if (method === 'POST' && pathname === '/mcp/tools/call') {
    let credential;
    try {
      credential = await resolveCredential(engine, authHeader);
    } catch (error) {
      await auditAuthFailure(
        engine,
        authHeader,
        error instanceof KitsuneError ? error.message : 'auth failed',
      );
      return { status: 401, body: { error: 'forbidden', message: 'Invalid API key' } };
    }

    if (!checkRateLimit(credential.keyId)) {
      return { status: 429, body: { error: 'rate_limited', message: 'Too many requests' } };
    }

    const payload = JSON.parse(rawBody || '{}') as {
      tool: string;
      arguments?: Record<string, unknown>;
    };
    if (!payload.tool) {
      return { status: 400, body: { error: 'validation', message: 'tool is required' } };
    }

    if (workspaceInjection(payload.arguments)) {
      return {
        status: 400,
        body: { error: 'validation', message: 'workspace parameters are not permitted' },
      };
    }

    try {
      const result = await invokeMcpTool(
        engine,
        {
          workspaceId: credential.workspaceId,
          principalId: credential.principalId,
        },
        payload.tool,
        payload.arguments ?? {},
      );
      void recordUsageEvent(engine.ownerPool, credential.workspaceId, payload.tool).catch(
        () => {},
      );
      return { status: 200, body: { result } };
    } catch (error) {
      if (isKitsuneError(error)) {
        return {
          status: 400,
          body: { error: error.code, message: error.message, ...error.details },
        };
      }
      throw error;
    }
  }

  return { status: 404, body: { error: 'not_found' } };
}
