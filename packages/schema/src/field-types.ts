/**
 * Field types supported by the CMS.
 *
 * This module is the single source of truth for what kinds of content
 * editors can define on a collection. Both the admin UI and the GraphQL
 * delivery API derive their behavior from these definitions.
 */

export type FieldType =
  | "string"
  | "text"
  | "markdown"
  | "number"
  | "boolean"
  | "date"
  | "select"
  | "reference"
  | "array"
  | "object"
  | "asset";

export interface BaseField {
  /** Machine name; stable identifier used as the key in document data. */
  name: string;
  /** Human-readable label shown in the admin UI. */
  label?: string;
  type: FieldType;
  required?: boolean;
  /**
   * When true, the field's value is stored as `{ _i18n: { [locale]: value } }`
   * in the document data blob.
   */
  localized?: boolean;
  /** Optional default value used on document creation. */
  default?: unknown;
  description?: string;
}

export interface StringField extends BaseField {
  type: "string";
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  unique?: boolean;
}

export interface TextField extends BaseField {
  type: "text";
  minLength?: number;
  maxLength?: number;
}

export interface MarkdownField extends BaseField {
  type: "markdown";
  maxLength?: number;
}

export interface NumberField extends BaseField {
  type: "number";
  integer?: boolean;
  min?: number;
  max?: number;
}

export interface BooleanField extends BaseField {
  type: "boolean";
}

export interface DateField extends BaseField {
  type: "date";
  /** If true, store only the date portion. */
  dateOnly?: boolean;
}

export interface SelectField extends BaseField {
  type: "select";
  options: readonly { value: string; label?: string }[];
  multiple?: boolean;
}

export interface ReferenceField extends BaseField {
  type: "reference";
  /** Slug of the collection this field references. */
  collection: string;
  /** If true, value is an array of document ids; otherwise a single id. */
  many?: boolean;
}

export interface ArrayField extends BaseField {
  type: "array";
  of: Field;
  minItems?: number;
  maxItems?: number;
}

export interface ObjectField extends BaseField {
  type: "object";
  fields: Field[];
}

export interface AssetField extends BaseField {
  type: "asset";
  /** Acceptable mime prefixes, e.g. "image/", "video/". */
  accept?: readonly string[];
}

export type Field =
  | StringField
  | TextField
  | MarkdownField
  | NumberField
  | BooleanField
  | DateField
  | SelectField
  | ReferenceField
  | ArrayField
  | ObjectField
  | AssetField;

/**
 * A fields tree that describes a collection's shape at a given schema version.
 */
export type Fields = readonly Field[];

export const LOCALIZED_ENVELOPE_KEY = "_i18n" as const;

export function isScalarFieldType(type: FieldType): boolean {
  return (
    type === "string" ||
    type === "text" ||
    type === "markdown" ||
    type === "number" ||
    type === "boolean" ||
    type === "date" ||
    type === "select" ||
    type === "reference" ||
    type === "asset"
  );
}

export function findField(fields: Fields, name: string): Field | undefined {
  for (const f of fields) {
    if (f.name === name) return f;
  }
  return undefined;
}

export function mapFields<T>(
  fields: Fields,
  fn: (field: Field, path: string[]) => T,
  path: string[] = [],
): T[] {
  const results: T[] = [];
  for (const field of fields) {
    const next = [...path, field.name];
    results.push(fn(field, next));
    if (field.type === "object") {
      results.push(...mapFields(field.fields, fn, next));
    } else if (field.type === "array" && field.of.type === "object") {
      results.push(...mapFields(field.of.fields, fn, [...next, "[]"]));
    }
  }
  return results;
}
