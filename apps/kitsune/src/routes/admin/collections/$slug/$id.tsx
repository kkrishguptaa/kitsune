import type { Fields } from "@kitsune/schema";
import {
  DocumentForm,
  LocaleSwitcher,
  PublishBar,
  RevisionsList,
} from "@kitsune/ui";
import { createFileRoute, notFound, useRouter } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  getCollectionFn,
  getDocumentFn,
  listLocalesFn,
  listRevisionsFn,
  publishDocumentFn,
  revertToRevisionFn,
  unpublishDocumentFn,
  updateDocumentFn,
} from "#/server/cms-actions";

export const Route = createFileRoute("/admin/collections/$slug/$id")({
  loader: async ({ params }) => {
    const collection = await getCollectionFn({ data: { slug: params.slug } });
    if (!collection || !collection.schemaVersion) throw notFound();
    const document = await getDocumentFn({ data: { id: params.id } });
    if (!document) throw notFound();
    const locales = await listLocalesFn();
    const revisions = await listRevisionsFn({
      data: { documentId: params.id },
    });
    return { collection, document, locales, revisions };
  },
  component: DocumentEditor,
});

function DocumentEditor() {
  const initial = Route.useLoaderData();
  const router = useRouter();

  const fields = (initial.collection.schemaVersion?.fields as Fields) ?? [];
  const defaultLocale = useMemo(
    () =>
      initial.locales.find((l) => l.isDefault)?.code ??
      initial.locales[0]?.code ??
      "en",
    [initial.locales],
  );

  const [locale, setLocale] = useState(defaultLocale);
  const [value, setValue] = useState<Record<string, unknown>>(
    initial.document.data,
  );
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showRevisions, setShowRevisions] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleChange(next: Record<string, unknown>): void {
    setValue(next);
    setDirty(true);
  }

  async function save(): Promise<void> {
    setError(null);
    setSaving(true);
    try {
      await updateDocumentFn({
        data: {
          collectionId: initial.collection.collection.id,
          documentId: initial.document.id,
          data: value,
        },
      });
      setDirty(false);
      await router.invalidate();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function publish(): Promise<void> {
    if (dirty) await save();
    await publishDocumentFn({
      data: {
        collectionId: initial.collection.collection.id,
        documentId: initial.document.id,
      },
    });
    await router.invalidate();
  }

  async function unpublish(): Promise<void> {
    await unpublishDocumentFn({
      data: {
        collectionId: initial.collection.collection.id,
        documentId: initial.document.id,
      },
    });
    await router.invalidate();
  }

  async function revert(revisionNumber: number): Promise<void> {
    await revertToRevisionFn({
      data: {
        collectionId: initial.collection.collection.id,
        documentId: initial.document.id,
        revisionNumber,
      },
    });
    await router.invalidate();
  }

  return (
    <div className="flex flex-col gap-4">
      <PublishBar
        status={initial.document.status}
        publishedAt={
          initial.document.publishedAt
            ? new Date(initial.document.publishedAt)
            : null
        }
        updatedAt={new Date(initial.document.updatedAt)}
        dirty={dirty}
        saving={saving}
        onSave={save}
        onPublish={publish}
        onUnpublish={unpublish}
        onOpenRevisions={() => setShowRevisions((s) => !s)}
      />
      {error ? (
        <div className="rounded-[12px] border border-[color-mix(in_oklab,var(--destructive)_40%,var(--line))] bg-[color-mix(in_oklab,var(--destructive)_10%,var(--surface))] p-3 text-sm text-[var(--destructive)]">
          {error}
        </div>
      ) : null}
      <div className="flex items-center justify-between">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--sea-ink-soft)]">
          Editing in <span className="text-[var(--sea-ink)]">{locale}</span>
        </p>
        <LocaleSwitcher
          locales={initial.locales}
          value={locale}
          onChange={setLocale}
        />
      </div>
      <DocumentForm
        fields={fields}
        value={value}
        onChange={handleChange}
        locale={locale}
        fallbackLocale={defaultLocale}
      />
      {showRevisions ? (
        <div className="admin-card px-5 py-4">
          <p className="admin-eyebrow mb-3">Revisions</p>
          <RevisionsList
            revisions={initial.revisions.map((r) => ({
              revisionNumber: r.revisionNumber,
              status: r.status,
              createdAt: new Date(r.createdAt),
              createdBy: r.createdBy,
            }))}
            onRevert={revert}
          />
        </div>
      ) : null}
    </div>
  );
}
