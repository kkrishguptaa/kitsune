import { Badge, Button, Input, Label } from "@kitsune/ui";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import {
  addLocaleFn,
  listLocalesFn,
  removeLocaleFn,
  setDefaultLocaleFn,
} from "#/server/cms-actions";

export const Route = createFileRoute("/admin/locales")({
  loader: async () => ({ locales: await listLocalesFn() }),
  component: LocalesPage,
});

function LocalesPage() {
  const { locales } = Route.useLoaderData();
  const router = useRouter();
  const [code, setCode] = useState("");
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add(): Promise<void> {
    setError(null);
    setBusy(true);
    try {
      await addLocaleFn({ data: { code, label } });
      setCode("");
      setLabel("");
      await router.invalidate();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function makeDefault(targetCode: string): Promise<void> {
    await setDefaultLocaleFn({ data: { code: targetCode } });
    await router.invalidate();
  }

  async function remove(targetCode: string): Promise<void> {
    try {
      await removeLocaleFn({ data: { code: targetCode } });
      await router.invalidate();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <>
      <header>
        <p className="admin-eyebrow mb-2">Chapter 02 · Translation</p>
        <h1 className="admin-heading">Locales</h1>
        <p className="mt-2 max-w-xl text-sm text-[var(--sea-ink-soft)]">
          Localized fields in any collection are authored per-locale. The
          default fills in as a fallback when a translation is missing.
        </p>
      </header>

      <div className="admin-card flex flex-wrap items-end gap-4 px-5 py-4">
        <div className="flex flex-col gap-1.5">
          <Label>Code</Label>
          <Input
            value={code}
            onChange={(e) => setCode(e.currentTarget.value)}
            placeholder="fr"
            className="w-32 font-mono"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Label</Label>
          <Input
            value={label}
            onChange={(e) => setLabel(e.currentTarget.value)}
            placeholder="Français"
            className="w-56"
          />
        </div>
        <Button onClick={add} disabled={busy || !code || !label}>
          Add locale
        </Button>
        {error ? (
          <p className="w-full text-xs text-[var(--destructive)]">{error}</p>
        ) : null}
      </div>

      <ul className="admin-card divide-y divide-[color-mix(in_oklab,var(--line)_80%,transparent)] overflow-hidden p-0">
        {locales.map((l) => (
          <li
            key={l.code}
            className="flex items-center gap-3 px-5 py-3.5 text-sm"
          >
            <span className="font-mono text-[13px] text-[var(--sea-ink)]">
              {l.code}
            </span>
            <span className="text-[var(--sea-ink-soft)]">{l.label}</span>
            {l.isDefault ? <Badge variant="ember">Default</Badge> : null}
            <div className="ml-auto flex gap-2">
              {!l.isDefault ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => makeDefault(l.code)}
                >
                  Make default
                </Button>
              ) : null}
              <Button
                size="sm"
                variant="destructive"
                onClick={() => remove(l.code)}
                disabled={l.isDefault}
              >
                Remove
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
