import { strict as assert } from "node:assert";
import { test } from "node:test";
import type { Fields } from "./field-types.ts";
import { contentHash } from "./hash.ts";

test("contentHash: stable across key order", () => {
  const a: Fields = [
    { name: "title", type: "string", required: true, label: "Title" },
  ];
  const b: Fields = [
    { label: "Title", required: true, type: "string", name: "title" } as Fields[number],
  ];
  assert.equal(contentHash(a), contentHash(b));
});

test("contentHash: differs when a field is added", () => {
  const a: Fields = [{ name: "title", type: "string", required: true }];
  const b: Fields = [
    { name: "title", type: "string", required: true },
    { name: "slug", type: "string" },
  ];
  assert.notEqual(contentHash(a), contentHash(b));
});

test("contentHash: ignores undefined properties", () => {
  const a: Fields = [{ name: "title", type: "string" }];
  const b: Fields = [
    { name: "title", type: "string", required: undefined, label: undefined },
  ];
  assert.equal(contentHash(a), contentHash(b));
});
