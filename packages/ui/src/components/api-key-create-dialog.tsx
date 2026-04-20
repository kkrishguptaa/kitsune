import { Copy } from "lucide-react";
import { useState } from "react";
import type * as React from "react";
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

  function reset(): void {
    setName("");
    setReadOnly(true);
    setWrite(false);
    setSchemaWrite(false);
    setFullKey(null);
    setCreating(false);
  }

  async function submit(): Promise<void> {
    if (!name.trim()) return;
    setCreating(true);
    try {
      const res = await onCreate({ name: name.trim(), readOnly, write, schemaWrite });
      setFullKey(res.fullKey);
    } finally {
      setCreating(false);
    }
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
              <DialogTitle>Copy your API key now</DialogTitle>
              <DialogDescription>
                This is the only time Kitsune will show this key. Store it in a
                secure secret manager before closing this dialog.
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center gap-2">
              <Input readOnly value={fullKey} className="font-mono text-xs" />
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  void navigator.clipboard.writeText(fullKey);
                }}
                title="Copy to clipboard"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <DialogFooter>
              <Button onClick={() => onOpenChange(false)}>Done</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Create API key</DialogTitle>
              <DialogDescription>
                Name and scope the key. Read-only keys are appropriate for
                most delivery clients; give write scope only to trusted
                services.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <Label>Name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.currentTarget.value)}
                  placeholder="Production website"
                />
              </div>
              <fieldset className="flex flex-col gap-2 text-sm">
                <legend className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Scopes
                </legend>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={readOnly}
                    onChange={(e) => {
                      setReadOnly(e.currentTarget.checked);
                      if (e.currentTarget.checked) {
                        setWrite(false);
                        setSchemaWrite(false);
                      }
                    }}
                  />
                  Read-only (delivery API only)
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={write}
                    onChange={(e) => {
                      setWrite(e.currentTarget.checked);
                      if (e.currentTarget.checked) setReadOnly(false);
                    }}
                  />
                  Allow document writes (create/update/publish/delete)
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={schemaWrite}
                    onChange={(e) => {
                      setSchemaWrite(e.currentTarget.checked);
                      if (e.currentTarget.checked) setReadOnly(false);
                    }}
                  />
                  Allow schema push (CLI use)
                </label>
              </fieldset>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button onClick={submit} disabled={!name.trim() || creating}>
                {creating ? "Creating…" : "Create key"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
