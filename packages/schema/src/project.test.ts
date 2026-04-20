import { strict as assert } from "node:assert";
import { test } from "node:test";
import type { Changeset } from "./diff.ts";
import type { Fields } from "./field-types.ts";
import { project } from "./project.ts";

test("project: rename applies in order", () => {
  const targetFields: Fields = [
    { name: "title", type: "string", required: true },
  ];
  const changesets: Record<number, Changeset> = {
    2: { ops: [{ op: "rename", from: "name", to: "title" }], destructive: false },
  };
  const out = project(
    { name: "Hello" },
    { fromVersion: 1, toVersion: 2, changesets, targetFields },
  );
  assert.deepEqual(out, { title: "Hello" });
});

test("project: default fills missing added fields", () => {
  const targetFields: Fields = [
    { name: "title", type: "string", required: true },
    { name: "slug", type: "string", required: true, default: "untitled" },
  ];
  const changesets: Record<number, Changeset> = {
    2: {
      ops: [
        {
          op: "add",
          path: "slug",
          field: {
            name: "slug",
            type: "string",
            required: true,
            default: "untitled",
          },
        },
      ],
      destructive: false,
    },
  };
  const out = project(
    { title: "Hello" },
    { fromVersion: 1, toVersion: 2, changesets, targetFields },
  );
  assert.deepEqual(out, { title: "Hello", slug: "untitled" });
});

test("project: drop removes field", () => {
  const targetFields: Fields = [
    { name: "title", type: "string", required: true },
  ];
  const changesets: Record<number, Changeset> = {
    2: { ops: [{ op: "drop", path: "legacy" }], destructive: true },
  };
  const out = project(
    { title: "Hello", legacy: "x" },
    { fromVersion: 1, toVersion: 2, changesets, targetFields },
  );
  assert.deepEqual(out, { title: "Hello" });
});

test("project: resolves localized envelope to requested locale", () => {
  const targetFields: Fields = [
    { name: "title", type: "string", required: true, localized: true },
  ];
  const out = project(
    { title: { _i18n: { en: "Hello", fr: "Bonjour" } } },
    {
      fromVersion: 1,
      toVersion: 1,
      changesets: {},
      targetFields,
      locale: "fr",
      fallbackLocale: "en",
    },
  );
  assert.deepEqual(out, { title: "Bonjour" });
});

test("project: falls back to fallbackLocale when requested locale missing", () => {
  const targetFields: Fields = [
    { name: "title", type: "string", required: true, localized: true },
  ];
  const out = project(
    { title: { _i18n: { en: "Hello" } } },
    {
      fromVersion: 1,
      toVersion: 1,
      changesets: {},
      targetFields,
      locale: "fr",
      fallbackLocale: "en",
    },
  );
  assert.deepEqual(out, { title: "Hello" });
});

test("project: strips unknown top-level keys", () => {
  const targetFields: Fields = [
    { name: "title", type: "string", required: true },
  ];
  const out = project(
    { title: "Hello", legacy: "x" },
    { fromVersion: 1, toVersion: 1, changesets: {}, targetFields },
  );
  assert.deepEqual(out, { title: "Hello" });
});
