import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { getAuth } from "@workos/authkit-tanstack-react-start";

export const Route = createFileRoute("/")({
  loader: async () => {
    const auth = await getAuth();
    if (auth.user) {
      throw redirect({ to: "/admin" });
    }
    return null;
  },
  component: Home,
});

function Home() {
  return (
    <main className="relative">
      <TopRibbon />

      <section className="page-wrap px-4 pb-24 pt-16 sm:pt-24">
        <div className="rise-in">
          <p className="kicker mb-6 flex items-center gap-3">
            <span className="kicker-rule" aria-hidden />
            <span>Chapter 00 · The Manifesto</span>
          </p>
          <h1 className="display-title mb-6 max-w-4xl text-[clamp(2.4rem,6vw,4.5rem)] leading-[0.98] font-bold tracking-[-0.02em] text-[var(--sea-ink)]">
            A headless CMS that treats your{" "}
            <em className="font-light italic text-[var(--lagoon-deep)]">
              content
            </em>{" "}
            like a living document — not a database dump.
          </h1>
          <p className="mb-10 max-w-2xl text-lg leading-relaxed text-[var(--sea-ink-soft)]">
            Multi-tenant, Postgres-backed, Markdown-first. Define models in the
            admin or push them from your TypeScript repo. Everything ships over
            a GraphQL API keyed by scoped tokens.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link to="/login" className="btn-primary">
              <span>Sign in to admin</span>
              <ArrowRightGlyph />
            </Link>
            <a
              href="https://tanstack.com/start"
              className="btn-ghost"
              target="_blank"
              rel="noreferrer"
            >
              Built on TanStack Start
            </a>
          </div>
        </div>

        <aside className="rise-in mt-16 grid grid-cols-1 gap-px overflow-hidden rounded-[2rem] border border-[var(--line)] bg-[var(--line)] sm:grid-cols-3">
          {MARQUEE.map((item) => (
            <div
              key={item.label}
              className="flex flex-col gap-1 bg-[var(--surface-strong)] px-6 py-5"
            >
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--kicker)]">
                {item.label}
              </span>
              <span className="font-mono text-sm text-[var(--sea-ink)]">
                {item.value}
              </span>
            </div>
          ))}
        </aside>
      </section>

      <section className="page-wrap px-4 pb-24">
        <p className="kicker mb-8 flex items-center gap-3">
          <span className="kicker-rule" aria-hidden />
          <span>Chapter 01 · The Grain</span>
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          <Feature
            number="01"
            title="Schema-in-DB"
            body="Content models are rows, not config files. Versioned, diffed, and safe to evolve — changes migrate documents lazily on read."
          />
          <Feature
            number="02"
            title="Markdown-first"
            body="Write in Markdown, not a lossy WYSIWYG. GraphQL consumers render it however their site wants to."
          />
          <Feature
            number="03"
            title="Multi-tenant"
            body="Every document, key, and schema lives inside a workspace. API keys are scoped, admins sign in with WorkOS AuthKit."
          />
        </div>
      </section>

      <footer className="border-t border-[var(--line)] bg-[color-mix(in_oklab,var(--foam)_72%,transparent)] px-4 py-8">
        <div className="page-wrap flex flex-wrap items-center justify-between gap-3 font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--sea-ink-soft)]">
          <span>Kitsune · v0 · atlas edition</span>
          <span>{new Date().getFullYear()} — built in the open</span>
        </div>
      </footer>
    </main>
  );
}

const MARQUEE = [
  { label: "Runtime", value: "TanStack Start + Bun" },
  { label: "Database", value: "Postgres · Drizzle" },
  { label: "Delivery", value: "GraphQL Yoga · Bearer" },
];

function TopRibbon() {
  return (
    <header className="border-b border-[var(--line)] bg-[color-mix(in_oklab,var(--header-bg)_90%,transparent)] backdrop-blur-sm">
      <div className="page-wrap flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <Mark />
          <span className="font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--sea-ink-soft)]">
            Kitsune
          </span>
        </div>
        <nav className="flex items-center gap-6 text-[12px] font-medium tracking-wide text-[var(--sea-ink-soft)]">
          <a
            href="https://github.com/kkrishguptaa/kitsune"
            target="_blank"
            rel="noreferrer"
            className="hover:text-[var(--sea-ink)]"
          >
            Source
          </a>
          <Link to="/login" className="hover:text-[var(--sea-ink)]">
            Admin →
          </Link>
        </nav>
      </div>
    </header>
  );
}

function Mark() {
  return (
    <span className="relative flex h-6 w-6 items-center justify-center rounded-full border border-[var(--sea-ink)] text-[var(--sea-ink)]">
      <svg
        viewBox="0 0 24 24"
        className="h-3 w-3"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        role="img"
        aria-labelledby="kitsune-mark-title"
      >
        <title id="kitsune-mark-title">Kitsune</title>
        <path
          d="M4 20L12 4L20 20"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M8 20L12 12L16 20"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

function ArrowRightGlyph() {
  return (
    <svg
      viewBox="0 0 16 16"
      className="h-[14px] w-[14px]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      role="img"
      aria-labelledby="arrow-right-title"
    >
      <title id="arrow-right-title">Arrow right</title>
      <path d="M2 8H13.5" strokeLinecap="round" />
      <path
        d="M9.5 4L14 8L9.5 12"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Feature({
  number,
  title,
  body,
}: {
  number: string;
  title: string;
  body: string;
}) {
  return (
    <article className="feature-card group relative overflow-hidden rounded-[1.5rem] border border-[var(--line)] p-6 transition-all">
      <span
        className="absolute -right-3 -top-4 select-none font-['Fraunces',serif] text-[5.5rem] font-light italic leading-none text-[var(--line)] transition-colors group-hover:text-[color-mix(in_oklab,var(--lagoon-deep)_30%,var(--line))]"
        aria-hidden
      >
        {number}
      </span>
      <h3 className="relative mb-3 text-[11px] uppercase tracking-[0.22em] font-semibold text-[var(--kicker)]">
        {title}
      </h3>
      <p className="relative text-sm leading-relaxed text-[var(--sea-ink-soft)]">
        {body}
      </p>
    </article>
  );
}
