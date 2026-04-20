# @kitsune/ui

shadcn-style React primitives + CMS-specific composites used by the
`apps/kitsune` admin console.

## Primitives

`Button`, `Input`, `Textarea`, `Label`, `Dialog`, `Select`, `Badge` — all
render via Radix + Tailwind using a `cn()` class merger.

## Composites

- `AdminShell` — sidebar layout. Accepts a `renderLink` prop so the host
  app can use its router's `<Link>` without coupling this package to a
  specific router.
- `MarkdownEditor` — wraps `@uiw/react-md-editor` with live preview.
- `FieldEditor` / `DocumentForm` — dispatch on field type from
  `@kitsune/schema`, respect `localized` by showing a locale switcher and
  writing to the `_i18n` envelope.
- `SchemaDesigner` — add / rename / drop / reorder / retype fields.
  Computes the diff via `diffSchemas` and forces the user to confirm
  destructive changes in a dialog before `onSave` is called.
- `LocaleSwitcher` — small `Select` helper.
- `DocumentTable` — status + timestamp + click-through.
- `PublishBar` — sticky header with save/publish/unpublish actions and a
  history button.
- `RevisionsList` — clickable revert buttons.
- `ApiKeyCreateDialog` — two-step dialog; the full key is shown exactly
  once after creation.

Tailwind v4 consumers can add an `@source` directive pointing at this
package's `src/` so the class names survive tree-shaking.
