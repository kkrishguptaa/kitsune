import { strict as assert } from "node:assert";
import { test } from "node:test";
import { compileZod } from "./compile-zod.ts";
import type { Fields } from "./field-types.ts";

test("compileZod: validates a simple required string", () => {
  const fields: Fields = [{ name: "title", type: "string", required: true }];
  const schema = compileZod(fields);
  assert.equal(schema.safeParse({ title: "Hello" }).success, true);
  assert.equal(schema.safeParse({}).success, false);
});

test("compileZod: allows optional fields to be omitted or null", () => {
  const fields: Fields = [
    { name: "title", type: "string", required: true },
    { name: "subtitle", type: "string" },
  ];
  const schema = compileZod(fields);
  assert.equal(schema.safeParse({ title: "x" }).success, true);
  assert.equal(schema.safeParse({ title: "x", subtitle: null }).success, true);
});

test("compileZod: localized field requires _i18n envelope", () => {
  const fields: Fields = [
    { name: "title", type: "string", required: true, localized: true },
  ];
  const schema = compileZod(fields);
  assert.equal(schema.safeParse({ title: "Hello" }).success, false);
  assert.equal(
    schema.safeParse({ title: { _i18n: { en: "Hello" } } }).success,
    true,
  );
});

test("compileZod: select with options", () => {
  const fields: Fields = [
    {
      name: "status",
      type: "select",
      required: true,
      options: [{ value: "draft" }, { value: "published" }],
    },
  ];
  const schema = compileZod(fields);
  assert.equal(schema.safeParse({ status: "draft" }).success, true);
  assert.equal(schema.safeParse({ status: "archived" }).success, false);
});

test("compileZod: nested object", () => {
  const fields: Fields = [
    {
      name: "seo",
      type: "object",
      fields: [
        { name: "title", type: "string", required: true },
        { name: "description", type: "text" },
      ],
    },
  ];
  const schema = compileZod(fields);
  assert.equal(
    schema.safeParse({ seo: { title: "Hi", description: null } }).success,
    true,
  );
  assert.equal(schema.safeParse({ seo: {} }).success, false);
});
