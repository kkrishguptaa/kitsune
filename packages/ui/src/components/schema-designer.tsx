import {
  diffSchemas,
  type Field,
  type Fields,
  type FieldType,
} from "@kitsune/schema";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import type * as React from "react";
import { useMemo, useState } from "react";
import { cn } from "../lib/cn.ts";
import { Badge } from "../primitives/badge.tsx";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../primitives/select.tsx";

const FIELD_TYPES: FieldType[] = [
  "string",
  "text",
  "markdown",
  "number",
  "boolean",
  "date",
  "select",
  "reference",
  "asset",
  "array",
  "object",
];

export interface SchemaDesignerProps {
  initial: Fields;
  onSave: (next: Fields) => void | Promise<void>;
  /** Disable Save while a request is in flight. */
  saving?: boolean;
  className?: string;
}

function blankField(type: FieldType = "string"): Field {
  const base = { name: "new_field", label: "New field", type };
  switch (type) {
    case "select":
      return { ...base, type: "select", options: [{ value: "option_1" }] };
    case "reference":
      return { ...base, type: "reference", collection: "" };
    case "array":
      return {
        ...base,
        type: "array",
        of: { name: "item", type: "string" },
      };
    case "object":
      return { ...base, type: "object", fields: [] };
    default:
      return { ...base, type } as Field;
  }
}

/**
 * Top-level schema designer. Supports add, rename (via name input), reorder
 * (up/down buttons for MVP — drag-and-drop can come later), drop, and type
 * change. Before saving it runs {@link diffSchemas} to surface destructive
 * changes and require explicit opt-in.
 */
export function SchemaDesigner({
  initial,
  onSave,
  saving,
  className,
}: SchemaDesignerProps): React.ReactElement {
  const [fields, setFields] = useState<Field[]>(() => [...initial]);
  const [renameHints, setRenameHints] = useState<Record<string, string>>({});
  const [confirmDrops, setConfirmDrops] = useState<string[]>([]);
  const [confirmRetypes, setConfirmRetypes] = useState<string[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);

  const diff = useMemo(
    () =>
      diffSchemas(initial, fields, {
        renames: renameHints,
        confirmDrops,
        confirmRetypes,
      }),
    [initial, fields, renameHints, confirmDrops, confirmRetypes],
  );

  function update(index: number, next: Field): void {
    setFields((prev) => {
      const out = [...prev];
      out[index] = next;
      return out;
    });
  }

  function move(index: number, delta: number): void {
    setFields((prev) => {
      const out = [...prev];
      const target = index + delta;
      if (target < 0 || target >= out.length) return prev;
      [out[index], out[target]] = [out[target]!, out[index]!];
      return out;
    });
  }

  function add(): void {
    setFields((prev) => [...prev, blankField()]);
  }

  function drop(index: number): void {
    setFields((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave(): Promise<void> {
    if (diff.destructive) {
      setPreviewOpen(true);
      return;
    }
    await onSave(fields);
  }

  return (
    <div className={cn("flex flex-col gap-5", className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="admin-eyebrow mb-1">Designer</p>
          <h2 className="font-serif text-xl font-semibold text-[var(--sea-ink)]">
            Fields
          </h2>
          <p className="text-sm text-[var(--sea-ink-soft)]">
            Shape the content editors will author for this collection.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPreviewOpen(true)}
          >
            Preview diff
          </Button>
          <Button
            variant="ember"
            size="sm"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving…" : "Save schema"}
          </Button>
        </div>
      </div>

      <ul className="flex flex-col gap-2">
        {fields.map((field, i) => (
          <li
            key={`${field.name}-${i}`}
            className="admin-card flex items-start gap-3 px-4 py-3"
          >
            <button
              type="button"
              onClick={() => move(i, -1)}
              className="mt-2 text-muted-foreground hover:text-foreground"
              title="Move up"
            >
              <GripVertical className="h-4 w-4" />
            </button>
            <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Name</Label>
                <Input
                  value={field.name}
                  onChange={(e) => {
                    const nextName = e.currentTarget.value;
                    const prevName = field.name;
                    // If the field was present in `initial` under a different
                    // name, treat this as a rename and record the hint.
                    const existedBefore = initial.some(
                      (f) => f.name === prevName,
                    );
                    if (existedBefore && nextName !== prevName) {
                      setRenameHints((prev) => ({
                        ...prev,
                        [prevName]: nextName,
                      }));
                    }
                    update(i, { ...field, name: nextName });
                  }}
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Label</Label>
                <Input
                  value={field.label ?? ""}
                  onChange={(e) =>
                    update(i, { ...field, label: e.currentTarget.value })
                  }
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Type</Label>
                <Select
                  value={field.type}
                  onValueChange={(t) =>
                    update(i, {
                      ...blankField(t as FieldType),
                      name: field.name,
                      label: field.label,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FIELD_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Flags</Label>
                <div className="flex items-center gap-3 text-xs">
                  <label className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={Boolean(field.required)}
                      onChange={(e) =>
                        update(i, {
                          ...field,
                          required: e.currentTarget.checked,
                        })
                      }
                    />
                    Required
                  </label>
                  <label className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={Boolean(field.localized)}
                      onChange={(e) =>
                        update(i, {
                          ...field,
                          localized: e.currentTarget.checked,
                        })
                      }
                    />
                    Localized
                  </label>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => move(i, -1)}
                title="Move up"
              >
                ↑
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => move(i, 1)}
                title="Move down"
              >
                ↓
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => drop(i)}
                title="Remove"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </li>
        ))}
      </ul>

      <Button variant="outline" onClick={add} className="self-start">
        <Plus className="h-4 w-4" /> Add field
      </Button>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Changeset preview</DialogTitle>
            <DialogDescription>
              Review how this schema change will migrate existing documents.
              Destructive operations must be confirmed before saving.
            </DialogDescription>
          </DialogHeader>
          <ul className="flex flex-col gap-2 text-sm">
            {diff.ops.length === 0 ? (
              <li className="text-[var(--sea-ink-soft)]">No changes yet.</li>
            ) : null}
            {diff.ops.map((op, idx) => {
              const path = "path" in op ? op.path : `${op.from} → ${op.to}`;
              return (
                <li key={`${op.op}-${idx}`} className="flex items-center gap-2">
                  <Badge
                    variant={op.op === "drop" ? "destructive" : "secondary"}
                  >
                    {op.op}
                  </Badge>
                  <span className="font-mono text-xs">{path}</span>
                  {op.op === "drop" ? (
                    <label className="ml-auto flex items-center gap-1 text-xs">
                      <input
                        type="checkbox"
                        checked={confirmDrops.includes(op.path)}
                        onChange={(e) =>
                          setConfirmDrops((prev) =>
                            e.currentTarget.checked
                              ? [...prev, op.path]
                              : prev.filter((p) => p !== op.path),
                          )
                        }
                      />
                      confirm
                    </label>
                  ) : null}
                  {op.op === "retype" ? (
                    <label className="ml-auto flex items-center gap-1 text-xs">
                      <input
                        type="checkbox"
                        checked={confirmRetypes.includes(op.path)}
                        onChange={(e) =>
                          setConfirmRetypes((prev) =>
                            e.currentTarget.checked
                              ? [...prev, op.path]
                              : prev.filter((p) => p !== op.path),
                          )
                        }
                      />
                      confirm
                    </label>
                  ) : null}
                </li>
              );
            })}
          </ul>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>
              Close
            </Button>
            <Button
              disabled={diff.destructive || saving}
              onClick={async () => {
                setPreviewOpen(false);
                await onSave(fields);
              }}
            >
              {diff.destructive ? "Confirm destructive changes first" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
