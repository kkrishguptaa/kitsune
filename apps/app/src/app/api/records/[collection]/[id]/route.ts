import type { ChangeOpInput, JsonValue } from '@kitsuneos/core';
import { handleRestRecordGet, httpAuthError } from '@kitsuneos/graphql';
import { NextResponse } from 'next/server';
import { engine } from '@/lib/engine';
import { resolveRequestAuth } from '@/lib/request-auth';
import { requireWorkspace } from '@/lib/require-workspace';

const NOT_FOUND = { error: 'Not found' } as const;

export async function GET(
  request: Request,
  context: { params: Promise<{ collection: string; id: string }> },
) {
  try {
    const ctx = await resolveRequestAuth(request);
    const { collection, id } = await context.params;
    const result = await handleRestRecordGet(engine, ctx, collection, id);
    if (result.status === 404) {
      return NextResponse.json(NOT_FOUND, { status: 404 });
    }
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    const failed = httpAuthError(error);
    if (failed.status === 401) {
      return NextResponse.json(failed.body, { status: 401 });
    }
    return NextResponse.json(NOT_FOUND, { status: 404 });
  }
}

/**
 * Update fields via propose → approve → apply (console human edit path).
 */
export async function PATCH(
  request: Request,
  context: { params: Promise<{ collection: string; id: string }> },
) {
  try {
    const ctx = await requireWorkspace();
    const { collection, id } = await context.params;
    const body = (await request.json()) as {
      fields?: Record<string, JsonValue>;
    };
    if (!body.fields || Object.keys(body.fields).length === 0) {
      return NextResponse.json(
        { error: 'fields are required' },
        { status: 400 },
      );
    }

    const operations: ChangeOpInput[] = Object.entries(body.fields).map(
      ([fieldName, newValue]) => ({
        collection,
        recordId: id,
        op: 'update' as const,
        fieldName,
        newValue,
      }),
    );

    const proposed = await engine.proposeChangeSet(
      ctx.workspaceId,
      ctx.principalId,
      {
        title: `Update ${collection}`,
        rationale: 'Console field edit',
        operations,
      },
    );

    const decisions = proposed.operationIds.map((opId) => ({
      opId,
      status: 'approved' as const,
    }));
    await engine.reviewChangeSet(
      ctx.workspaceId,
      ctx.principalId,
      proposed.changeSetId,
      decisions,
    );
    const applied = await engine.applyChangeSet(
      ctx.workspaceId,
      ctx.principalId,
      proposed.changeSetId,
    );

    return NextResponse.json({
      changeSetId: proposed.changeSetId,
      applied,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = message.includes('Unauthorized') ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
