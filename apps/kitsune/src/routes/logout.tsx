import { createFileRoute } from "@tanstack/react-router";
import { signOut } from "@workos/authkit-tanstack-react-start";

export const Route = createFileRoute("/logout")({
  loader: async () => {
    await signOut();
    return null;
  },
  component: () => null,
});
