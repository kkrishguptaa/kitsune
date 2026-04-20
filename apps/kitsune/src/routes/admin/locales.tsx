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
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-2xl font-semibold">Locales</h1>
        <p className="text-sm text-muted-foreground">
          Localized fields in any collection are authored per-locale.
        </p>
      </header>

      <div className="flex flex-wrap items-end gap-3 rounded-lg border p-4">
        <div className="flex flex-col gap-1">
          <Label>Code</Label>
          <Input
            value={code}
            onChange={(e) => setCode(e.currentTarget.value)}
            placeholder="fr"
            className="w-32"
          />
        </div>
        <div className="flex flex-col gap-1">
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
        {error ? <p className="w-full text-xs text-destructive">{error}</p> : null}
      </div>

      <ul className="divide-y rounded-lg border">
        {locales.map((l) => (
          <li
            key={l.code}
            className="flex items-center gap-3 px-4 py-3 text-sm"
          >
            <span className="font-mono">{l.code}</span>
            <span className="text-muted-foreground">{l.label}</span>
            {l.isDefault ? <Badge>Default</Badge> : null}
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
    </div>
  );
}
