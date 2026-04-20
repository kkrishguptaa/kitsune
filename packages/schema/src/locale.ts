import { LOCALIZED_ENVELOPE_KEY } from "./field-types.ts";

/**
 * Shape of a localized field's stored value:
 *   { _i18n: { en: "Hello", fr: "Bonjour" } }
 *
 * A non-localized field stores its value directly.
 */
export interface LocalizedEnvelope<T> {
  [LOCALIZED_ENVELOPE_KEY]: Record<string, T>;
}

export function isLocalizedEnvelope(
  value: unknown,
): value is LocalizedEnvelope<unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    LOCALIZED_ENVELOPE_KEY in (value as Record<string, unknown>)
  );
}

export function wrapLocale<T>(
  value: T,
  locale: string,
): LocalizedEnvelope<T> {
  return { [LOCALIZED_ENVELOPE_KEY]: { [locale]: value } };
}

export function mergeLocale<T>(
  existing: LocalizedEnvelope<T> | undefined,
  value: T,
  locale: string,
): LocalizedEnvelope<T> {
  const prev = existing?.[LOCALIZED_ENVELOPE_KEY] ?? {};
  return { [LOCALIZED_ENVELOPE_KEY]: { ...prev, [locale]: value } };
}

export function readLocale<T>(
  envelope: LocalizedEnvelope<T> | T | undefined | null,
  locale: string,
  fallbackLocale?: string,
): T | null {
  if (envelope == null) return null;
  if (!isLocalizedEnvelope(envelope)) {
    // Field may have become localized after the document was stored.
    return envelope as T;
  }
  const map = envelope[LOCALIZED_ENVELOPE_KEY];
  if (locale in map) return map[locale] as T;
  if (fallbackLocale && fallbackLocale in map) {
    return map[fallbackLocale] as T;
  }
  const first = Object.values(map)[0];
  return (first ?? null) as T | null;
}
