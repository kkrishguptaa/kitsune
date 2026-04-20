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
    <>
      <header>
        <p className="admin-eyebrow mb-2">Chapter 03 · People</p>
        <h1 className="admin-heading">Members</h1>
        <p className="mt-2 max-w-xl text-sm text-[var(--sea-ink-soft)]">
          Roles gate what each member can do inside the workspace. Admins manage
          keys & schemas; editors author; viewers read.
        </p>
      </header>

      <div className="admin-card grid gap-4 px-5 py-4 sm:grid-cols-4">
        <div className="flex flex-col gap-1.5">
          <Label>WorkOS user id</Label>
          <Input
            value={userId}
            onChange={(e) => setUserId(e.currentTarget.value)}
            placeholder="user_..."
            className="font-mono"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Email</Label>
          <Input
            value={email}
            onChange={(e) => setEmail(e.currentTarget.value)}
            placeholder="alex@example.com"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Role</Label>
          <select
            value={role}
            onChange={(e) => setRole(e.currentTarget.value as typeof role)}
            className="h-10 rounded-[10px] border border-[var(--line-strong)] bg-[var(--surface-inset)] px-3 text-sm text-[var(--sea-ink)] shadow-[0_1px_0_var(--inset-glint)_inset] focus-visible:border-[var(--lagoon-deep)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
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
          <p className="col-span-full text-xs text-[var(--destructive)]">
            {error}
          </p>
        ) : null}
      </div>

      <ul className="admin-card divide-y divide-[color-mix(in_oklab,var(--line)_80%,transparent)] overflow-hidden p-0">
        {members.map((m) => (
          <li
            key={m.userId}
            className="flex items-center gap-3 px-5 py-3.5 text-sm"
          >
            <span className="font-mono text-[11.5px] text-[var(--sea-ink-soft)]">
              {m.userId}
            </span>
            <span className="text-[var(--sea-ink)]">{m.email}</span>
            <Badge
              className="ml-auto"
              variant={
                m.role === "owner" || m.role === "admin" ? "ember" : "secondary"
              }
            >
              {m.role}
            </Badge>
          </li>
        ))}
      </ul>
    </>
  );
}
