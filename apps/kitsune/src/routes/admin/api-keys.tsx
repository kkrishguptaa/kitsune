import {
  ApiKeyCreateDialog,
  Badge,
  Button,
} from "@kitsune/ui";
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
    <div className="flex flex-col gap-5">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold">API keys</h1>
          <p className="text-sm text-muted-foreground">
            Delivery and CLI clients authenticate with these Bearer tokens.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>Create key</Button>
      </header>

      <ul className="divide-y rounded-lg border">
        {keys.length === 0 ? (
          <li className="px-4 py-6 text-center text-sm text-muted-foreground">
            No API keys yet.
          </li>
        ) : null}
        {keys.map((k) => (
          <li
            key={k.id}
            className="flex items-center gap-3 px-4 py-3 text-sm"
          >
            <div className="flex flex-col">
              <span className="font-medium">{k.name}</span>
              <span className="font-mono text-xs text-muted-foreground">
                {k.keyPrefix}
              </span>
            </div>
            <div className="ml-3 flex gap-1">
              {k.scopes.readOnly ? (
                <Badge variant="secondary">read</Badge>
              ) : null}
              {k.scopes.write ? <Badge>write</Badge> : null}
              {k.scopes.schemaWrite ? (
                <Badge variant="outline">schema</Badge>
              ) : null}
              {k.revokedAt ? (
                <Badge variant="destructive">revoked</Badge>
              ) : null}
            </div>
            <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
              {k.lastUsedAt
                ? `used ${new Date(k.lastUsedAt).toLocaleDateString()}`
                : "never used"}
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
    </div>
  );
}
