import {
  type Field,
  LOCALIZED_ENVELOPE_KEY,
  isLocalizedEnvelope,
} from "@kitsune/schema";
import type * as React from "react";
import { cn } from "../lib/cn.ts";
import { Input } from "../primitives/input.tsx";
import { Label } from "../primitives/label.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../primitives/select.tsx";
import { Textarea } from "../primitives/textarea.tsx";
import { MarkdownEditor } from "./markdown-editor.tsx";

export interface FieldEditorProps {
  field: Field;
  value: unknown;
  onChange: (next: unknown) => void;
  /** The active locale for localized fields. */
  locale: string;
  /** Fallback locale (typically the workspace default). */
  fallbackLocale?: string;
  /** Visual nesting depth for indentation. */
  depth?: number;
  className?: string;
}

function readLocaleValue(
  value: unknown,
  locale: string,
  fallbackLocale?: string,
): unknown {
  if (!isLocalizedEnvelope(value)) return value;
  const map = value[LOCALIZED_ENVELOPE_KEY];
  if (locale in map) return map[locale];
  if (fallbackLocale && fallbackLocale in map) return map[fallbackLocale];
  return undefined;
}

function writeLocaleValue(
  previous: unknown,
  nextValue: unknown,
  locale: string,
): unknown {
  const envelope = isLocalizedEnvelope(previous)
    ? { ...previous[LOCALIZED_ENVELOPE_KEY] }
    : {};
  envelope[locale] = nextValue;
  return { [LOCALIZED_ENVELOPE_KEY]: envelope };
}

/**
 * Renders an editor for a single field from a collection schema. The
 * editor always talks in the stored representation (localized fields see
 * the `_i18n` envelope via `value`/`onChange`); the active-locale view is
 * computed internally.
 */
export function FieldEditor({
  field,
  value,
  onChange,
  locale,
  fallbackLocale,
  depth = 0,
  className,
}: FieldEditorProps): React.ReactElement {
  const localized = Boolean(field.localized);
  const displayValue = localized
    ? readLocaleValue(value, locale, fallbackLocale)
    : value;

  function handleChange(next: unknown): void {
    if (localized) {
      onChange(writeLocaleValue(value, next, locale));
    } else {
      onChange(next);
    }
  }

  return (
    <div
      className={cn("flex flex-col gap-1.5", className)}
      style={{ marginLeft: depth * 12 }}
    >
      <div className="flex items-center justify-between">
        <Label htmlFor={field.name} className="text-sm">
          {field.label ?? field.name}
          {field.required ? <span className="ml-0.5 text-red-500">*</span> : null}
        </Label>
        {localized ? (
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
            {locale}
          </span>
        ) : null}
      </div>
      {field.description ? (
        <p className="text-xs text-muted-foreground">{field.description}</p>
      ) : null}
      <FieldControl
        field={field}
        value={displayValue}
        onChange={handleChange}
        locale={locale}
        fallbackLocale={fallbackLocale}
      />
    </div>
  );
}

function FieldControl({
  field,
  value,
  onChange,
  locale,
  fallbackLocale,
}: FieldEditorProps): React.ReactElement {
  switch (field.type) {
    case "string":
      return (
        <Input
          id={field.name}
          value={(value as string | undefined) ?? ""}
          onChange={(e) => onChange(e.currentTarget.value)}
          placeholder={field.label ?? field.name}
        />
      );
    case "text":
      return (
        <Textarea
          id={field.name}
          value={(value as string | undefined) ?? ""}
          onChange={(e) => onChange(e.currentTarget.value)}
          rows={4}
        />
      );
    case "markdown":
      return (
        <MarkdownEditor
          id={field.name}
          value={(value as string | undefined) ?? ""}
          onChange={(next) => onChange(next)}
        />
      );
    case "number":
      return (
        <Input
          id={field.name}
          type="number"
          value={
            typeof value === "number"
              ? value
              : typeof value === "string"
                ? value
                : ""
          }
          onChange={(e) => {
            const raw = e.currentTarget.value;
            if (raw === "") return onChange(null);
            const parsed = field.integer
              ? Number.parseInt(raw, 10)
              : Number.parseFloat(raw);
            onChange(Number.isNaN(parsed) ? null : parsed);
          }}
          step={field.integer ? 1 : "any"}
        />
      );
    case "boolean":
      return (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => onChange(e.currentTarget.checked)}
          />
          <span className="text-muted-foreground">
            {value ? "Enabled" : "Disabled"}
          </span>
        </label>
      );
    case "date":
      return (
        <Input
          id={field.name}
          type={field.dateOnly ? "date" : "datetime-local"}
          value={(value as string | undefined) ?? ""}
          onChange={(e) => onChange(e.currentTarget.value || null)}
        />
      );
    case "select": {
      if (field.multiple) {
        return (
          <div className="flex flex-wrap gap-1">
            {field.options.map((o) => {
              const selected = Array.isArray(value) && value.includes(o.value);
              return (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => {
                    const next = new Set(
                      Array.isArray(value) ? (value as string[]) : [],
                    );
                    if (selected) next.delete(o.value);
                    else next.add(o.value);
                    onChange(Array.from(next));
                  }}
                  className={cn(
                    "rounded-md border px-2 py-1 text-xs transition-colors",
                    selected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input bg-background",
                  )}
                >
                  {o.label ?? o.value}
                </button>
              );
            })}
          </div>
        );
      }
      return (
        <Select
          value={(value as string | undefined) ?? ""}
          onValueChange={(v) => onChange(v || null)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Pick one" />
          </SelectTrigger>
          <SelectContent>
            {field.options.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label ?? o.value}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }
    case "reference":
      return (
        <Input
          id={field.name}
          value={
            field.many
              ? Array.isArray(value)
                ? (value as string[]).join(",")
                : ""
              : (value as string | undefined) ?? ""
          }
          onChange={(e) => {
            const raw = e.currentTarget.value;
            if (field.many) {
              onChange(
                raw
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
              );
            } else {
              onChange(raw || null);
            }
          }}
          placeholder={`uuid${field.many ? " (comma-separated)" : ""}`}
        />
      );
    case "asset":
      return (
        <Input
          id={field.name}
          value={(value as string | undefined) ?? ""}
          onChange={(e) => onChange(e.currentTarget.value || null)}
          placeholder="asset uuid"
        />
      );
    case "array":
    case "object":
      // MVP: JSON textarea for arrays and objects. We can upgrade to nested
      // FieldEditor rendering once there's a stable add/remove UX here.
      return (
        <Textarea
          id={field.name}
          value={value == null ? "" : JSON.stringify(value, null, 2)}
          onChange={(e) => {
            const raw = e.currentTarget.value;
            if (raw.trim() === "") return onChange(null);
            try {
              onChange(JSON.parse(raw));
            } catch {
              // Keep the raw text visible until it parses.
              onChange(raw);
            }
          }}
          rows={6}
          spellCheck={false}
        />
      );
    default: {
      const _exhaustive: never = field;
      return _exhaustive;
    }
  }

  // Locale reuse silences unused-parameter warning.
  void locale;
  void fallbackLocale;
}
