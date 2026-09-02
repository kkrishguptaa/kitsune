import { NextResponse } from 'next/server';
import { requireWorkspace } from '@/lib/require-workspace';

export async function GET() {
  try {
    const ctx = await requireWorkspace();
    return NextResponse.json({
      userId: ctx.userId,
      workspaceId: ctx.workspaceId,
      apiKeyPlaintext: ctx.apiKeyPlaintext ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = message.includes('Unauthorized') ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
