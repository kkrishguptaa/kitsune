import type { Fields } from "@kitsune/schema";
import type * as React from "react";
import { cn } from "../lib/cn.ts";
import { FieldEditor } from "./field-editor.tsx";

export interface DocumentFormProps {
  fields: Fields;
  value: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
  locale: string;
  fallbackLocale?: string;
  className?: string;
}

/**
 * Top-level document editor: renders a {@link FieldEditor} per top-level
 * field in a collection's current schema.
 */
export function DocumentForm({
  fields,
  value,
  onChange,
  locale,
  fallbackLocale,
  className,
}: DocumentFormProps): React.ReactElement {
  return (
    <div
      className={cn(
        "admin-card flex flex-col gap-6 px-6 py-6 sm:px-8 sm:py-7",
        className,
      )}
    >
      {fields.map((field) => (
        <FieldEditor
          key={field.name}
          field={field}
          value={value[field.name]}
          onChange={(next) => onChange({ ...value, [field.name]: next })}
          locale={locale}
          fallbackLocale={fallbackLocale}
        />
      ))}
    </div>
  );
}
