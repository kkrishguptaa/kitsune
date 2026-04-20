import { Badge, Button, Input, Label } from "@kitsune/ui";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { inviteMemberFn, listMembersFn } from "#/server/cms-actions";

export const Route = createFileRoute("/admin/members")({
  loader: async () => ({ members: await listMembersFn() }),
  component: MembersPage,
});

function MembersPage() {
  const { members } = Route.useLoaderData();
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "editor" | "viewer">("editor");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function invite(): Promise<void> {
    setError(null);
    setBusy(true);
    try {
      await inviteMemberFn({ data: { userId, email, role } });
      setUserId("");
      setEmail("");
      await router.invalidate();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-2xl font-semibold">Members</h1>
        <p className="text-sm text-muted-foreground">
          Roles gate what each member can do inside the workspace.
        </p>
      </header>

      <div className="grid gap-3 rounded-lg border p-4 sm:grid-cols-4">
        <div className="flex flex-col gap-1">
          <Label>WorkOS user id</Label>
          <Input
            value={userId}
            onChange={(e) => setUserId(e.currentTarget.value)}
            placeholder="user_..."
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label>Email</Label>
          <Input
            value={email}
            onChange={(e) => setEmail(e.currentTarget.value)}
            placeholder="alex@example.com"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label>Role</Label>
          <select
            value={role}
            onChange={(e) =>
              setRole(e.currentTarget.value as typeof role)
            }
            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
          >
            <option value="admin">admin</option>
            <option value="editor">editor</option>
            <option value="viewer">viewer</option>
          </select>
        </div>
        <div className="flex items-end">
          <Button onClick={invite} disabled={busy || !userId || !email}>
            Invite
          </Button>
        </div>
        {error ? (
          <p className="col-span-full text-xs text-destructive">{error}</p>
        ) : null}
      </div>

      <ul className="divide-y rounded-lg border">
        {members.map((m) => (
          <li
            key={m.userId}
            className="flex items-center gap-3 px-4 py-3 text-sm"
          >
            <span className="font-mono text-xs">{m.userId}</span>
            <span className="text-muted-foreground">{m.email}</span>
            <Badge className="ml-auto" variant="secondary">
              {m.role}
            </Badge>
          </li>
        ))}
      </ul>
    </div>
  );
}
