import { createFileRoute, redirect } from "@tanstack/react-router";
import { getAuth, getSignInUrl } from "@workos/authkit-tanstack-react-start";

/**
 * Kicks the user over to WorkOS AuthKit with `/admin` encoded as the
 * returnPathname so the callback lands them directly on the dashboard.
 * If they already have a session, short-circuit to `/admin` without a
 * round-trip.
 */
export const Route = createFileRoute("/login")({
  loader: async () => {
    const auth = await getAuth();
    if (auth.user) {
      throw redirect({ to: "/admin" });
    }
    const url = await getSignInUrl({ data: "/admin" });
    throw redirect({ href: url });
  },
  component: () => null,
});
