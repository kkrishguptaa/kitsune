import { createFileRoute, redirect } from "@tanstack/react-router";
import { getAuth } from "@workos/authkit-tanstack-react-start";

export const Route = createFileRoute("/onboarding")({
  loader: async () => {
    const auth = await getAuth();
    if (!auth.user) {
      throw redirect({ to: "/login" });
    }
    return null;
  },
  component: Onboarding,
});

function Onboarding() {
  return (
    <main className="admin-surface min-h-screen px-4 py-20">
      <section className="page-wrap">
        <p className="kicker mb-6 flex items-center gap-3">
          <span className="kicker-rule" aria-hidden />
          <span>Chapter 00 · First landing</span>
        </p>
        <h1 className="display-title mb-4 max-w-2xl text-4xl font-semibold leading-[1.05] tracking-tight text-[var(--sea-ink)] sm:text-5xl">
          You're in. Your workspace is being cast.
        </h1>
        <p className="max-w-xl text-base text-[var(--sea-ink-soft)]">
          Kitsune is provisioning a personal workspace for your account on first
          sign-in. Give it a moment, then reload — the admin console will appear
          here.
        </p>
        <div className="mt-8 flex items-center gap-3">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="btn-primary"
          >
            Reload
          </button>
          <a href="/" className="btn-ghost">
            Back to landing
          </a>
        </div>
      </section>
    </main>
  );
}
