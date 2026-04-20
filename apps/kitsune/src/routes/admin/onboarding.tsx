import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/onboarding")({
  component: Onboarding,
});

function Onboarding() {
  return (
    <main className="mx-auto flex max-w-lg flex-col gap-3 p-10 text-sm">
      <h1 className="text-2xl font-semibold">You're in.</h1>
      <p className="text-muted-foreground">
        Your workspace is being provisioned on first sign-in. Reload in a
        moment to see the admin console.
      </p>
    </main>
  );
}
