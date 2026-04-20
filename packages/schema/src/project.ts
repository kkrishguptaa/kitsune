import type { ChangeOp, Changeset } from "./diff.ts";
import {
  type Field,
  type Fields,
  LOCALIZED_ENVELOPE_KEY,
  findField,
} from "./field-types.ts";
import { isLocalizedEnvelope, readLocale } from "./locale.ts";

export interface ProjectOptions {
  /** Schema version the raw `data` blob was stored under. */
  fromVersion: number;
  /** Target schema version (usually the collection's current version). */
  toVersion: number;
  /**
   * Changesets per version, keyed by the version number they transition *to*.
   * To migrate a document from v3 to v5, we apply changesets[4] then [5].
   */
  changesets: Record<number, Changeset>;
  /** Target schema fields tree (used to know which fields to keep + validate). */
  targetFields: Fields;
  /** Locale requested by the caller, applied to localized fields. */
  locale?: string;
  /** Fallback locale used when `locale` is missing from an envelope. */
  fallbackLocale?: string;
  /**
   * If true, project returns the raw stored value for localized fields
   * (the `_i18n` envelope) rather than resolving to a single locale.
   * Admin UIs want this; the delivery GraphQL API does not.
   */
  preserveLocalizedEnvelopes?: boolean;
}

type DataRecord = Record<string, unknown>;

function applyOp(data: DataRecord, op: ChangeOp): void {
  switch (op.op) {
    case "rename": {
      if (op.from in data) {
        data[op.to] = data[op.from];
        delete data[op.from];
      }
      break;
    }
    case "add": {
      if (!(op.path in data) && op.field.default !== undefined) {
        data[op.path] = op.field.default;
      }
      break;
    }
    case "defaultAdded": {
      if (data[op.path] == null) data[op.path] = op.value;
      break;
    }
    case "drop": {
      delete data[op.path];
      break;
    }
    case "localizedChanged": {
      const current = data[op.path];
      if (op.to === true && !isLocalizedEnvelope(current) && current != null) {
        // Non-localized -> localized: wrap the existing scalar under the
        // default locale. The projector caller supplies which locale to use.
        data[op.path] = {
          [LOCALIZED_ENVELOPE_KEY]: { __default__: current },
        };
      } else if (op.to === false && isLocalizedEnvelope(current)) {
        // Localized -> non-localized: take the first available locale.
        const map = current[LOCALIZED_ENVELOPE_KEY] as Record<
          string,
          unknown
        >;
        const first = map ? Object.values(map)[0] : undefined;
        data[op.path] = first ?? null;
      }
      break;
    }
    case "retype":
    case "requiredChanged":
      // retype is either safe (string->text, etc.) or destructive (rejected
      // upstream). requiredChanged only affects validation, not storage.
      break;
  }
}

function resolveLocalized(
  data: DataRecord,
  fields: Fields,
  locale: string | undefined,
  fallbackLocale: string | undefined,
): DataRecord {
  if (!locale) return data;
  const out: DataRecord = {};
  for (const f of fields) {
    const value = data[f.name];
    if (f.localized && isLocalizedEnvelope(value)) {
      out[f.name] = readLocale(value, locale, fallbackLocale);
    } else if (f.type === "object" && value && typeof value === "object") {
      out[f.name] = resolveLocalized(
        value as DataRecord,
        f.fields,
        locale,
        fallbackLocale,
      );
    } else if (
      f.type === "array" &&
      f.of.type === "object" &&
      Array.isArray(value)
    ) {
      out[f.name] = value.map((item) =>
        item && typeof item === "object"
          ? resolveLocalized(
              item as DataRecord,
              (f.of as { fields: Fields }).fields,
              locale,
              fallbackLocale,
            )
          : item,
      );
    } else {
      out[f.name] = value;
    }
  }
  return out;
}

/**
 * Project a document's raw `data` blob through the chain of changesets from
 * its stored schema version to the target schema version, and optionally
 * resolve localized fields to a single locale.
 *
 * The projector is intentionally forgiving: unknown fields are dropped, and
 * missing optional fields remain missing. Required-field violations are the
 * concern of {@link compileZod}, not of `project`.
 */
export function project(
  raw: unknown,
  options: ProjectOptions,
): DataRecord {
  const data: DataRecord =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? { ...(raw as DataRecord) }
      : {};

  const {
    fromVersion,
    toVersion,
    changesets,
    targetFields,
    locale,
    fallbackLocale,
    preserveLocalizedEnvelopes,
  } = options;

  if (fromVersion < toVersion) {
    for (let v = fromVersion + 1; v <= toVersion; v += 1) {
      const cs = changesets[v];
      if (!cs) continue;
      for (const op of cs.ops) applyOp(data, op);
    }
  }

  // Strip unknown top-level keys (fields that aren't in the target schema).
  for (const key of Object.keys(data)) {
    if (!findField(targetFields, key)) {
      delete data[key];
    }
  }

  if (preserveLocalizedEnvelopes) return data;
  return resolveLocalized(data, targetFields, locale, fallbackLocale);
}

export function inferFieldByPath(fields: Fields, path: string): Field | null {
  const parts = path.split(".");
  let current: Fields | null = fields;
  let last: Field | null = null;
  for (const part of parts) {
    if (!current) return null;
    const f = findField(current, part);
    if (!f) return null;
    last = f;
    if (f.type === "object") current = f.fields;
    else if (f.type === "array" && f.of.type === "object") {
      current = f.of.fields;
    } else current = null;
  }
  return last;
}
