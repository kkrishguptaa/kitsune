import { z } from "zod";
import {
  type Field,
  type Fields,
  LOCALIZED_ENVELOPE_KEY,
} from "./field-types.ts";

export interface CompileZodOptions {
  /**
   * Locales recognized by the workspace. Used to validate localized field
   * envelopes. The default locale is the only locale required to be present
   * on required localized fields.
   */
  locales?: readonly string[];
  defaultLocale?: string;
  /**
   * If true, the compiled schema rejects unknown top-level keys on the
   * document data blob. Defaults to false so projections from older schema
   * versions can still carry legacy keys that will be stripped on the next
   * write.
   */
  strict?: boolean;
}

function compileScalar(field: Field): z.ZodTypeAny {
  switch (field.type) {
    case "string": {
      let schema = z.string();
      if (field.minLength != null) schema = schema.min(field.minLength);
      if (field.maxLength != null) schema = schema.max(field.maxLength);
      if (field.pattern) schema = schema.regex(new RegExp(field.pattern));
      return schema;
    }
    case "text": {
      let schema = z.string();
      if (field.minLength != null) schema = schema.min(field.minLength);
      if (field.maxLength != null) schema = schema.max(field.maxLength);
      return schema;
    }
    case "markdown": {
      let schema = z.string();
      if (field.maxLength != null) schema = schema.max(field.maxLength);
      return schema;
    }
    case "number": {
      let schema = field.integer ? z.number().int() : z.number();
      if (field.min != null) schema = schema.min(field.min);
      if (field.max != null) schema = schema.max(field.max);
      return schema;
    }
    case "boolean":
      return z.boolean();
    case "date":
      return z.union([z.string().datetime({ offset: true }), z.date()]);
    case "select": {
      const values = field.options.map((o) => o.value) as [
        string,
        ...string[],
      ];
      const enumSchema = z.enum(values);
      return field.multiple ? z.array(enumSchema) : enumSchema;
    }
    case "reference":
      return field.many ? z.array(z.string().uuid()) : z.string().uuid();
    case "asset":
      return z.string().uuid();
    case "array": {
      let schema = z.array(compileField(field.of));
      if (field.minItems != null) schema = schema.min(field.minItems);
      if (field.maxItems != null) schema = schema.max(field.maxItems);
      return schema;
    }
    case "object": {
      return compileObject(field.fields);
    }
    default: {
      const _exhaustive: never = field;
      return _exhaustive;
    }
  }
}

function compileField(field: Field): z.ZodTypeAny {
  let schema = compileScalar(field);

  if (!field.required) {
    schema = schema.nullable().optional();
  }

  if (field.localized) {
    const localeMap = z.record(z.string(), schema);
    const envelope = z.object({ [LOCALIZED_ENVELOPE_KEY]: localeMap });
    schema = field.required ? envelope : envelope.nullable().optional();
  }

  return schema;
}

function compileObject(fields: Fields): z.ZodTypeAny {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const f of fields) {
    shape[f.name] = compileField(f);
  }
  return z.object(shape);
}

/**
 * Compile a Zod schema for a collection's current schema version.
 * The produced schema validates the *stored* `data` JSONB, including
 * `_i18n` envelopes for localized fields.
 */
export function compileZod(
  fields: Fields,
  options: CompileZodOptions = {},
): z.ZodTypeAny {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const f of fields) {
    shape[f.name] = compileField(f);
  }
  const schema = z.object(shape);
  return options.strict ? schema.strict() : schema;
}
