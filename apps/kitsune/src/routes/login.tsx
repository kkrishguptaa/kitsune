import { createFileRoute, redirect } from "@tanstack/react-router";
import { getSignInUrl } from "@workos/authkit-tanstack-react-start";

export const Route = createFileRoute("/login")({
  loader: async () => {
    const url = await getSignInUrl();
    throw redirect({ href: url });
  },
  component: () => null,
});
