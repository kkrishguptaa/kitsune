import type { Field, Fields } from "./field-types.ts";

/**
 * A single atomic change between two schema versions, expressed at the
 * top-level field granularity. Nested object/array field changes are
 * emitted as separate entries using dot paths (`parent.child`, `list[].name`).
 */
export type ChangeOp =
  | { op: "add"; path: string; field: Field }
  | { op: "drop"; path: string }
  | { op: "rename"; from: string; to: string }
  | {
      op: "retype";
      path: string;
      from: Field["type"];
      to: Field["type"];
    }
  | { op: "defaultAdded"; path: string; value: unknown }
  | { op: "requiredChanged"; path: string; from: boolean; to: boolean }
  | {
      op: "localizedChanged";
      path: string;
      from: boolean;
      to: boolean;
    };

export interface Changeset {
  /** Ordered list of operations. */
  ops: ChangeOp[];
  /** True when at least one op is destructive and not yet resolved via a hint. */
  destructive: boolean;
}

export interface DiffHints {
  /**
   * Explicit renames keyed by the old top-level field name.
   * Without a hint, an `add` + `drop` pair is assumed (destructive).
   */
  renames?: Record<string, string>;
  /**
   * Explicit default-fills keyed by field path. Supplying a default turns a
   * new required field into a non-destructive change.
   */
  defaults?: Record<string, unknown>;
  /**
   * Explicit opt-in to drop a field. Without this, a drop is considered
   * destructive and will be rejected until the caller confirms.
   */
  confirmDrops?: string[];
  /** Explicit opt-in for `retype` transitions that are not safe widenings. */
  confirmRetypes?: string[];
}

const SAFE_WIDENINGS = new Set<`${string}->${string}`>([
  "string->text",
  "text->markdown",
  "string->markdown",
]);

function isSafeRetype(from: Field["type"], to: Field["type"]): boolean {
  if (from === to) return true;
  return SAFE_WIDENINGS.has(`${from}->${to}`);
}

function fieldsByName(fields: Fields): Map<string, Field> {
  const m = new Map<string, Field>();
  for (const f of fields) m.set(f.name, f);
  return m;
}

/**
 * Compute the diff from `prev` to `next` at the top-level of a fields tree.
 * Nested structural changes (inside object/array fields) are detected but
 * reported as a combined `retype` on the enclosing field name — the migration
 * runner then decides whether to rewrite or reject. This keeps the MVP simple
 * while still being safe.
 */
export function diffSchemas(
  prev: Fields,
  next: Fields,
  hints: DiffHints = {},
): Changeset {
  const ops: ChangeOp[] = [];
  let destructive = false;

  const prevMap = fieldsByName(prev);
  const nextMap = fieldsByName(next);

  const renames = hints.renames ?? {};
  const renamedFrom = new Set(Object.keys(renames));
  const renamedTo = new Set(Object.values(renames));

  // Renames first (they consume the from/to names).
  for (const [from, to] of Object.entries(renames)) {
    const prevField = prevMap.get(from);
    const nextField = nextMap.get(to);
    if (!prevField || !nextField) {
      // Stale hint; ignore it — subsequent add/drop detection will report.
      continue;
    }
    ops.push({ op: "rename", from, to });
    // If the type changed as part of the rename, emit a retype op.
    if (prevField.type !== nextField.type) {
      const safe = isSafeRetype(prevField.type, nextField.type);
      ops.push({
        op: "retype",
        path: to,
        from: prevField.type,
        to: nextField.type,
      });
      if (!safe && !hints.confirmRetypes?.includes(to)) destructive = true;
    }
    if (Boolean(prevField.required) !== Boolean(nextField.required)) {
      ops.push({
        op: "requiredChanged",
        path: to,
        from: Boolean(prevField.required),
        to: Boolean(nextField.required),
      });
      if (nextField.required && !(to in (hints.defaults ?? {}))) {
        destructive = true;
      }
    }
    if (Boolean(prevField.localized) !== Boolean(nextField.localized)) {
      ops.push({
        op: "localizedChanged",
        path: to,
        from: Boolean(prevField.localized),
        to: Boolean(nextField.localized),
      });
      // Localization toggles always need a projection pass, but are not
      // destructive — the projector handles wrap/unwrap with fallback.
    }
  }

  // Adds: fields present in next but absent in prev and not the target of a rename.
  for (const [name, field] of nextMap) {
    if (prevMap.has(name) || renamedTo.has(name)) continue;
    ops.push({ op: "add", path: name, field });
    const hasDefault =
      field.default !== undefined || name in (hints.defaults ?? {});
    if (field.required && !hasDefault) {
      destructive = true;
    } else if (field.default === undefined && name in (hints.defaults ?? {})) {
      ops.push({
        op: "defaultAdded",
        path: name,
        value: (hints.defaults ?? {})[name],
      });
    }
  }

  // Drops: fields present in prev but absent in next and not the source of a rename.
  for (const [name] of prevMap) {
    if (nextMap.has(name) || renamedFrom.has(name)) continue;
    ops.push({ op: "drop", path: name });
    if (!hints.confirmDrops?.includes(name)) destructive = true;
  }

  // Same-name fields: detect retype / required / localized / default changes.
  for (const [name, prevField] of prevMap) {
    const nextField = nextMap.get(name);
    if (!nextField) continue;

    if (prevField.type !== nextField.type) {
      const safe = isSafeRetype(prevField.type, nextField.type);
      ops.push({
        op: "retype",
        path: name,
        from: prevField.type,
        to: nextField.type,
      });
      if (!safe && !hints.confirmRetypes?.includes(name)) destructive = true;
    }

    if (Boolean(prevField.required) !== Boolean(nextField.required)) {
      ops.push({
        op: "requiredChanged",
        path: name,
        from: Boolean(prevField.required),
        to: Boolean(nextField.required),
      });
      if (nextField.required && !(name in (hints.defaults ?? {}))) {
        destructive = true;
      }
    }

    if (Boolean(prevField.localized) !== Boolean(nextField.localized)) {
      ops.push({
        op: "localizedChanged",
        path: name,
        from: Boolean(prevField.localized),
        to: Boolean(nextField.localized),
      });
    }

    if (
      prevField.default === undefined &&
      nextField.default !== undefined
    ) {
      ops.push({
        op: "defaultAdded",
        path: name,
        value: nextField.default,
      });
    }
  }

  return { ops, destructive };
}
