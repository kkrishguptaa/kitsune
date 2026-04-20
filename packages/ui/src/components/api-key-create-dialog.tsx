import { Copy } from "lucide-react";
import type * as React from "react";
import { useState } from "react";
import { cn } from "../lib/cn.ts";
import { Button } from "../primitives/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../primitives/dialog.tsx";
import { Input } from "../primitives/input.tsx";
import { Label } from "../primitives/label.tsx";

export interface ApiKeyCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (input: {
    name: string;
    readOnly: boolean;
    write: boolean;
    schemaWrite: boolean;
  }) => Promise<{ fullKey: string }>;
}

/**
 * Two-step dialog:
 *   1) collect name + scopes,
 *   2) display the full key exactly once with a copy button.
 *
 * The full key is *only* shown here — once the user dismisses the dialog
 * it's gone, matching Stripe / GitHub patterns.
 */
export function ApiKeyCreateDialog({
  open,
  onOpenChange,
  onCreate,
}: ApiKeyCreateDialogProps): React.ReactElement {
  const [name, setName] = useState("");
  const [readOnly, setReadOnly] = useState(true);
  const [write, setWrite] = useState(false);
  const [schemaWrite, setSchemaWrite] = useState(false);
  const [creating, setCreating] = useState(false);
  const [fullKey, setFullKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function reset(): void {
    setName("");
    setReadOnly(true);
    setWrite(false);
    setSchemaWrite(false);
    setFullKey(null);
    setCreating(false);
    setCopied(false);
  }

  async function submit(): Promise<void> {
    if (!name.trim()) return;
    setCreating(true);
    try {
      const res = await onCreate({
        name: name.trim(),
        readOnly,
        write,
        schemaWrite,
      });
      setFullKey(res.fullKey);
    } finally {
      setCreating(false);
    }
  }

  async function copyKey(): Promise<void> {
    if (!fullKey) return;
    await navigator.clipboard.writeText(fullKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) reset();
      }}
    >
      <DialogContent>
        {fullKey ? (
          <>
            <DialogHeader>
              <p className="admin-eyebrow">One-time reveal</p>
              <DialogTitle>Copy your key now.</DialogTitle>
              <DialogDescription>
                This is the only time Kitsune will show this value. Store it in
                a secret manager before you close this dialog.
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center gap-2 rounded-[12px] border border-[var(--line-strong)] bg-[var(--surface-inset)] p-2">
              <Input
                readOnly
                value={fullKey}
                className="border-none bg-transparent px-2 font-mono text-[12px] shadow-none focus-visible:ring-0"
              />
              <Button
                variant="ember"
                size="sm"
                onClick={copyKey}
                title="Copy to clipboard"
              >
                <Copy className="h-4 w-4" />
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
            <DialogFooter>
              <Button onClick={() => onOpenChange(false)}>Done</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <p className="admin-eyebrow">New credential</p>
              <DialogTitle>Create API key</DialogTitle>
              <DialogDescription>
                Name the key and pick its scope. Read-only suits most delivery
                clients; give write scope only to trusted services.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>Name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.currentTarget.value)}
                  placeholder="Production website"
                />
              </div>
              <fieldset className="flex flex-col gap-2">
                <legend className="admin-eyebrow mb-1">Scopes</legend>
                <ScopeOption
                  active={readOnly}
                  onChange={(checked) => {
                    setReadOnly(checked);
                    if (checked) {
                      setWrite(false);
                      setSchemaWrite(false);
                    }
                  }}
                  title="Read-only"
                  body="Delivery API only. Perfect for your public site."
                />
                <ScopeOption
                  active={write}
                  onChange={(checked) => {
                    setWrite(checked);
                    if (checked) setReadOnly(false);
                  }}
                  title="Document writes"
                  body="Create, update, publish, and delete documents."
                />
                <ScopeOption
                  active={schemaWrite}
                  onChange={(checked) => {
                    setSchemaWrite(checked);
                    if (checked) setReadOnly(false);
                  }}
                  title="Schema push"
                  body="CLI-driven schema changes from your repo."
                />
              </fieldset>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                variant="ember"
                onClick={submit}
                disabled={!name.trim() || creating}
              >
                {creating ? "Creating…" : "Create key"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ScopeOption({
  active,
  onChange,
  title,
  body,
}: {
  active: boolean;
  onChange: (next: boolean) => void;
  title: string;
  body: string;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-[12px] border px-3.5 py-3 transition-all",
        active
          ? "border-[var(--ember)] bg-[var(--ember-soft)]"
          : "border-[var(--line-strong)] bg-[var(--surface-inset)] hover:border-[var(--lagoon-deep)]",
      )}
    >
      <input
        type="checkbox"
        checked={active}
        onChange={(e) => onChange(e.currentTarget.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--ember)]"
      />
      <span className="flex flex-col gap-0.5">
        <span className="text-[13.5px] font-medium text-[var(--sea-ink)]">
          {title}
        </span>
        <span className="text-[12.5px] text-[var(--sea-ink-soft)]">{body}</span>
      </span>
    </label>
  );
}
