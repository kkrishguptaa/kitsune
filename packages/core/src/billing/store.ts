import type { Pool } from 'pg';

export async function recordUsageEvent(
  pool: Pool,
  workspaceId: string,
  kind: string,
  count = 1,
): Promise<void> {
  await pool.query(
    `INSERT INTO kitsune.usage_events (workspace_id, kind, count) VALUES ($1, $2, $3)`,
    [workspaceId, kind, count],
  );
}

export async function upsertSubscription(
  pool: Pool,
  input: {
    workspaceId: string;
    dodoSubscriptionId: string;
    dodoCustomerId?: string | null;
    status: string;
  },
): Promise<void> {
  const existing = await pool.query<{ id: string }>(
    `SELECT id FROM kitsune.subscriptions WHERE dodo_subscription_id = $1`,
    [input.dodoSubscriptionId],
  );
  if (existing.rows[0]) {
    await pool.query(
      `UPDATE kitsune.subscriptions
          SET status = $1, dodo_customer_id = COALESCE($2, dodo_customer_id), updated_at = now()
        WHERE dodo_subscription_id = $3`,
      [input.status, input.dodoCustomerId ?? null, input.dodoSubscriptionId],
    );
    return;
  }
  await pool.query(
    `INSERT INTO kitsune.subscriptions (id, workspace_id, dodo_subscription_id, dodo_customer_id, status)
     VALUES (gen_random_uuid(), $1, $2, $3, $4)`,
    [input.workspaceId, input.dodoSubscriptionId, input.dodoCustomerId ?? null, input.status],
  );
}

export async function recordBillingEvent(
  pool: Pool,
  eventId: string,
  payload: unknown,
): Promise<boolean> {
  const result = await pool.query(
    `INSERT INTO kitsune.billing_events (event_id, payload)
     VALUES ($1, $2)
     ON CONFLICT (event_id) DO NOTHING
     RETURNING event_id`,
    [eventId, JSON.stringify(payload)],
  );
  return result.rows.length > 0;
}

export async function findWorkspaceByDodoCustomer(
  pool: Pool,
  customerId: string,
): Promise<string | null> {
  const result = await pool.query<{ workspace_id: string }>(
    `SELECT workspace_id FROM kitsune.subscriptions
      WHERE dodo_customer_id = $1
      ORDER BY created_at DESC
      LIMIT 1`,
    [customerId],
  );
  return result.rows[0]?.workspace_id ?? null;
}
