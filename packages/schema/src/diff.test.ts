import { strict as assert } from "node:assert";
import { test } from "node:test";
import { diffSchemas } from "./diff.ts";
import type { Fields } from "./field-types.ts";

test("diffSchemas: non-destructive add of optional field", () => {
  const prev: Fields = [{ name: "title", type: "string", required: true }];
  const next: Fields = [
    { name: "title", type: "string", required: true },
    { name: "subtitle", type: "string" },
  ];
  const cs = diffSchemas(prev, next);
  assert.equal(cs.destructive, false);
  assert.deepEqual(
    cs.ops.map((o) => o.op),
    ["add"],
  );
});

test("diffSchemas: destructive add of required field without default", () => {
  const prev: Fields = [{ name: "title", type: "string", required: true }];
  const next: Fields = [
    { name: "title", type: "string", required: true },
    { name: "slug", type: "string", required: true },
  ];
  const cs = diffSchemas(prev, next);
  assert.equal(cs.destructive, true);
});

test("diffSchemas: required field with hint default is non-destructive", () => {
  const prev: Fields = [{ name: "title", type: "string", required: true }];
  const next: Fields = [
    { name: "title", type: "string", required: true },
    { name: "slug", type: "string", required: true },
  ];
  const cs = diffSchemas(prev, next, { defaults: { slug: "untitled" } });
  assert.equal(cs.destructive, false);
});

test("diffSchemas: drop is destructive unless confirmed", () => {
  const prev: Fields = [
    { name: "title", type: "string", required: true },
    { name: "legacy", type: "string" },
  ];
  const next: Fields = [{ name: "title", type: "string", required: true }];
  assert.equal(diffSchemas(prev, next).destructive, true);
  assert.equal(
    diffSchemas(prev, next, { confirmDrops: ["legacy"] }).destructive,
    false,
  );
});

test("diffSchemas: rename with hint emits rename op", () => {
  const prev: Fields = [{ name: "oldName", type: "string", required: true }];
  const next: Fields = [{ name: "newName", type: "string", required: true }];
  const cs = diffSchemas(prev, next, { renames: { oldName: "newName" } });
  assert.deepEqual(
    cs.ops.map((o) => o.op),
    ["rename"],
  );
  assert.equal(cs.destructive, false);
});

test("diffSchemas: safe widening string->text is non-destructive", () => {
  const prev: Fields = [{ name: "body", type: "string", required: true }];
  const next: Fields = [{ name: "body", type: "text", required: true }];
  const cs = diffSchemas(prev, next);
  assert.equal(cs.destructive, false);
  assert.deepEqual(
    cs.ops.map((o) => o.op),
    ["retype"],
  );
});

test("diffSchemas: destructive retype unless confirmed", () => {
  const prev: Fields = [{ name: "count", type: "number", required: true }];
  const next: Fields = [{ name: "count", type: "string", required: true }];
  assert.equal(diffSchemas(prev, next).destructive, true);
  assert.equal(
    diffSchemas(prev, next, { confirmRetypes: ["count"] }).destructive,
    false,
  );
});
