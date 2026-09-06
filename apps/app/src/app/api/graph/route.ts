import { NextResponse } from 'next/server';
import { engine } from '@/lib/engine';
import { jsonError } from '@/lib/http-error';
import { requireWorkspace } from '@/lib/require-workspace';

/**
 * Graph distribution API — nodes/edges for Obsidian-like views and exporters.
 */
export async function GET(request: Request) {
  try {
    const ctx = await requireWorkspace();
    const url = new URL(request.url);
    const focusCollection = url.searchParams.get('collection');
    const focusRecordId = url.searchParams.get('recordId');
    const depthParam = Number(url.searchParams.get('depth') ?? '1');
    const maxDepth = Math.min(3, Math.max(1, Number.isFinite(depthParam) ? depthParam : 1));

    const schema = await engine.describeSchema(ctx.workspaceId, ctx.principalId);
    const collections = schema.collections ?? [];

    const nodes: Array<{ id: string; collection: string; label: string }> = [];
    const edges: Array<{ from: string; to: string; field: string }> = [];
    const seen = new Set<string>();
    const depthLeft = new Map<string, number>();

    async function addRecord(collection: string, recordId: string, remaining: number) {
      const key = `${collection}:${recordId}`;
      if (seen.has(key)) {
        return;
      }
      seen.add(key);
      depthLeft.set(key, remaining);
      const record = await engine.readRecord(
        ctx.workspaceId,
        ctx.principalId,
        collection,
        recordId,
      );
      if (!record) return;
      const label =
        (typeof record.title === 'string' && record.title) ||
        (typeof record.name === 'string' && record.name) ||
        recordId.slice(0, 8);
      nodes.push({ id: key, collection, label });
      if (remaining <= 0) return;
      const related = await engine.listRelated(
        ctx.workspaceId,
        ctx.principalId,
        collection,
        recordId,
      );
      for (const edge of related.outgoing) {
        const targetKey = `${edge.collection}:${edge.recordId}`;
        edges.push({ from: key, to: targetKey, field: edge.field });
        await addRecord(edge.collection, edge.recordId, remaining - 1);
      }
      for (const edge of related.incoming) {
        const sourceKey = `${edge.collection}:${edge.recordId}`;
        edges.push({ from: sourceKey, to: key, field: edge.field });
        await addRecord(edge.collection, edge.recordId, remaining - 1);
      }
    }

    if (focusCollection && focusRecordId) {
      await addRecord(focusCollection, focusRecordId, maxDepth);
    } else {
      for (const collection of collections.slice(0, 8)) {
        const rows = await engine.query(ctx.workspaceId, ctx.principalId, {
          collection: collection.name,
          limit: 20,
        });
        for (const row of rows) {
          if (typeof row.id === 'string') {
            await addRecord(collection.name, row.id, 1);
          }
        }
      }
    }

    return NextResponse.json({
      nodes,
      edges,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return jsonError(error);
  }
}
