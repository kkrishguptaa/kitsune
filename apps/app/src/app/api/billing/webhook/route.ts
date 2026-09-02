// workspace-lint: ignore — webhook metadata maps Dodo customer to provisioned workspace.
import { NextResponse } from 'next/server';
import { Webhook } from 'standardwebhooks';
import {
  findWorkspaceByDodoCustomer,
  recordBillingEvent,
  upsertSubscription,
} from '@kitsuneos/core';
import { mapDodoSubscriptionStatus } from '@/lib/dodo';
import { engine } from '@/lib/engine';

export async function POST(request: Request) {
  const webhookKey = process.env.DODO_PAYMENTS_WEBHOOK_KEY;
  if (!webhookKey) {
    return NextResponse.json({ error: 'Webhook key not configured' }, { status: 503 });
  }

  const rawBody = await request.text();
  const webhookId = request.headers.get('webhook-id') ?? '';
  const webhookSignature = request.headers.get('webhook-signature') ?? '';
  const webhookTimestamp = request.headers.get('webhook-timestamp') ?? '';

  let event: { type: string; data: Record<string, unknown> };
  try {
    const verifier = new Webhook(webhookKey);
    const verified = verifier.verify(rawBody, {
      'webhook-id': webhookId,
      'webhook-signature': webhookSignature,
      'webhook-timestamp': webhookTimestamp,
    });
    event = JSON.parse(String(verified)) as { type: string; data: Record<string, unknown> };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 401 });
  }

  const eventId = webhookId || `${event.type}:${JSON.stringify(event.data).slice(0, 64)}`;
  const isNew = await recordBillingEvent(engine.ownerPool, eventId, event);
  if (!isNew) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  if (!event.type.startsWith('subscription.')) {
    return NextResponse.json({ received: true, ignored: true });
  }

  const subscription = event.data as {
    subscription_id?: string;
    customer_id?: string;
    status?: string;
    metadata?: { kitsune_workspace?: string; workspace_id?: string };
  };

  const status = mapDodoSubscriptionStatus(
    event.type,
    subscription.status ?? event.type,
  ) as Parameters<typeof upsertSubscription>[1]['status'];

  let workspaceId =
    subscription.metadata?.kitsune_workspace ??
    subscription.metadata?.workspace_id ??
    null;
  if (!workspaceId && subscription.customer_id) {
    workspaceId = await findWorkspaceByDodoCustomer(engine.ownerPool, subscription.customer_id);
  }

  if (workspaceId && subscription.subscription_id) {
    await upsertSubscription(engine.ownerPool, {
      workspaceId,
      dodoSubscriptionId: subscription.subscription_id,
      dodoCustomerId: subscription.customer_id ?? null,
      status,
    });
  }

  return NextResponse.json({ received: true });
}
