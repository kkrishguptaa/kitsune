import { Link, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return (
    <main className="page-wrap px-4 pb-16 pt-14">
      <section className="island-shell rise-in relative overflow-hidden rounded-[2rem] px-6 py-12 sm:px-12 sm:py-16">
        <div className="pointer-events-none absolute -left-24 -top-24 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(79,184,178,0.32),transparent_66%)]" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(47,106,74,0.18),transparent_66%)]" />
        <p className="island-kicker mb-3">Kitsune</p>
        <h1 className="display-title mb-5 max-w-3xl text-4xl leading-[1.02] font-bold tracking-tight text-[var(--sea-ink)] sm:text-6xl">
          A headless CMS that grows with your schema.
        </h1>
        <p className="mb-8 max-w-2xl text-base text-[var(--sea-ink-soft)] sm:text-lg">
          Multi-tenant, Postgres-backed, Markdown-first. Define content
          models in the admin UI or push them from your TypeScript repo.
          Deliver everything over a GraphQL API keyed by scoped API keys.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            to="/login"
            className="inline-flex h-11 items-center rounded-full bg-[var(--sea-ink)] px-6 text-sm font-medium text-white shadow-sm transition-opacity hover:opacity-90"
          >
            Sign in to admin
          </Link>
          <a
            href="https://tanstack.com/start"
            className="inline-flex h-11 items-center rounded-full border border-[var(--line)] bg-[var(--surface)] px-6 text-sm font-medium text-[var(--sea-ink)] transition-colors hover:bg-[var(--link-bg-hover)]"
          >
            Built on TanStack Start →
          </a>
        </div>
      </section>

      <section className="mt-10 grid gap-4 sm:grid-cols-3">
        <Feature
          title="Schema-in-DB"
          body="Content models are rows, not config files. Versioned, diffed, and safe to evolve — schema changes migrate documents lazily on read."
        />
        <Feature
          title="Markdown-first"
          body="Write in Markdown, not a lossy WYSIWYG. Your GraphQL consumers render it however their site wants."
        />
        <Feature
          title="Multi-tenant"
          body="Every document, key, and schema lives inside a workspace. API keys are scoped, admins sign in with WorkOS AuthKit."
        />
      </section>
    </main>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <article className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6">
      <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--kicker)]">
        {title}
      </h3>
      <p className="text-sm text-[var(--sea-ink-soft)]">{body}</p>
    </article>
  );
}
