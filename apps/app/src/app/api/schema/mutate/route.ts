import type { FieldDefinition, SchemaChangeOp } from '@kitsuneos/core';
import { NextResponse } from 'next/server';
import { engine } from '@/lib/engine';
import { requireWorkspace } from '@/lib/require-workspace';

export async function POST(request: Request) {
  try {
    const ctx = await requireWorkspace();
    const body = (await request.json()) as {
      collection?: string;
      op?: SchemaChangeOp;
      fieldName?: string;
      field?: FieldDefinition;
      indexed?: boolean;
      confirmStaleIds?: string[];
    };
    if (!body.collection || !body.op) {
      return NextResponse.json(
        { error: 'collection and op are required' },
        { status: 400 },
      );
    }

    const input = {
      collection: body.collection,
      op: body.op,
      fieldName: body.fieldName,
      field: body.field,
      indexed: body.indexed,
    };

    const preview = await engine.previewSchemaChange(
      ctx.workspaceId,
      ctx.principalId,
      input,
    );

    const result = await engine.applySchemaChange(
      ctx.workspaceId,
      ctx.principalId,
      {
        ...input,
        confirmStaleIds:
          body.confirmStaleIds ?? preview.incompatibleChangeSetIds,
      },
    );

    return NextResponse.json({ ...result, preview });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = message.includes('Unauthorized') ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
