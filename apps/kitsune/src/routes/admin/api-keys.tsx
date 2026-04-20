import { ApiKeyCreateDialog, Badge, Button } from "@kitsune/ui";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import {
  createApiKeyFn,
  listApiKeysFn,
  revokeApiKeyFn,
} from "#/server/cms-actions";

export const Route = createFileRoute("/admin/api-keys")({
  loader: async () => ({ keys: await listApiKeysFn() }),
  component: ApiKeysPage,
});

function ApiKeysPage() {
  const { keys } = Route.useLoaderData();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function create(input: {
    name: string;
    readOnly: boolean;
    write: boolean;
    schemaWrite: boolean;
  }): Promise<{ fullKey: string }> {
    const res = await createApiKeyFn({ data: input });
    await router.invalidate();
    return { fullKey: res.fullKey };
  }

  async function revoke(id: string): Promise<void> {
    await revokeApiKeyFn({ data: { id } });
    await router.invalidate();
  }

  return (
    <>
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="admin-eyebrow mb-2">Chapter 04 · Delivery</p>
          <h1 className="admin-heading">API keys</h1>
          <p className="mt-2 max-w-xl text-sm text-[var(--sea-ink-soft)]">
            Delivery clients and CLIs authenticate with these Bearer tokens.
            You'll see the full value exactly once on creation — store it
            somewhere safe.
          </p>
        </div>
        <Button variant="ember" onClick={() => setOpen(true)}>
          Create key
        </Button>
      </header>

      <ul className="admin-card divide-y divide-[color-mix(in_oklab,var(--line)_80%,transparent)] overflow-hidden p-0">
        {keys.length === 0 ? (
          <li className="px-6 py-10 text-center text-sm text-[var(--sea-ink-soft)]">
            No API keys yet.
          </li>
        ) : null}
        {keys.map((k) => (
          <li
            key={k.id}
            className="flex flex-wrap items-center gap-3 px-5 py-3.5 text-sm"
          >
            <div className="flex flex-col">
              <span className="font-medium text-[var(--sea-ink)]">
                {k.name}
              </span>
              <span className="font-mono text-[11.5px] text-[var(--sea-ink-soft)]">
                {k.keyPrefix}
              </span>
            </div>
            <div className="ml-3 flex flex-wrap gap-1">
              {k.scopes.readOnly ? (
                <Badge variant="secondary">read</Badge>
              ) : null}
              {k.scopes.write ? <Badge variant="lagoon">write</Badge> : null}
              {k.scopes.schemaWrite ? (
                <Badge variant="ember">schema</Badge>
              ) : null}
              {k.revokedAt ? (
                <Badge variant="destructive">revoked</Badge>
              ) : null}
            </div>
            <div className="ml-auto flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--sea-ink-soft)]">
              <span>
                {k.lastUsedAt
                  ? `used ${new Date(k.lastUsedAt).toLocaleDateString()}`
                  : "never used"}
              </span>
              {!k.revokedAt ? (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => revoke(k.id)}
                >
                  Revoke
                </Button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>

      <ApiKeyCreateDialog
        open={open}
        onOpenChange={setOpen}
        onCreate={create}
      />
    </>
  );
}
