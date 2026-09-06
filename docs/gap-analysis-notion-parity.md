# Gap Analysis — Notion Clone PRD vs KitsuneOS

**Date:** 6 September 2026  
**Sources:** `docs/prd-notion-clone.md`, `docs/prd.md`, `docs/system-design.md`, codebase inventory  
**Rule:** System Design / existing Kitsune PRD wins on engine constraints; Notion Clone PRD wins on missing *product* surfaces we now choose to build.

---

## 1. Strategic comparison

| Dimension | Notion | KitsuneOS today | Verdict |
|-----------|--------|-----------------|---------|
| Primary noun | Page / block | Record-as-page in typed collection | Close IA; weaker wiki/share |
| Data model | Soft properties + blocks | Relational collections + field grants + change sets | Kitsune stronger for agents/DB |
| AuthZ | Page ACL + workspace | Collection grants + teams; weak page ACL | **Gap** |
| Multi-workspace | First-class switcher | Memberships in DB; no switcher UX | **Gap** |
| Agents | Integrations / AI | MCP + default agent key | Partial — need profiles |
| API | Notion Public API | REST + MCP + read GraphQL | Strong; need OAuth apps |
| Editor | Blocks WYSIWYG | Prose textarea | **Gap** |
| Graph | Limited | Relation neighbors API only | **Gap** UI |
| Memory | AI connectors | Grant-aware `search` | Need Supermemory-shaped tools |

Kitsune should **not** abandon change sets / field grants. Extend them with Notion-class sharing, editor, multi-ws, agents, OAuth, graph, and memory tools.

---

## 2. Requirement matrix

| ID | Requirement | Kitsune today | Gap | Build priority |
|----|-------------|---------------|-----|----------------|
| N1 | Multi-workspace membership + switcher | `workspace_memberships` + `users.workspace_id` pointer; `listMembershipsForUser`; **no** switch/create UI/API | Switch API, create-another-workspace, sidebar switcher | **P0** |
| N2 | Private / shared pages + team shares | Collection grants + teams; pages inherit collection visibility | `page_shares` / visibility column; filter list/get/search | **P0** |
| N3 | Agent profiles + API tokens | Single default agent + rotate key in Connect | CRUD agents, per-agent keys UI/API | **P0** |
| N4 | General fetch/change API | Substantial REST/MCP | Document + fill holes; **OAuth apps** missing | **P0** |
| N4b | OAuth apps create databases | None | OAuth app registry, authorize, `databases:create` | **P0** |
| N5 | WYSIWYG prose | `Textarea` markdown | TipTap/Lexical editor + JSON/md storage | **P0** |
| N6 | Obsidian-like graph | `listRelated` / `/api/related` | Graph page + `/api/graph` + link extraction | **P1** |
| N7 | Supermemory-like tools | MCP `search`, VFS | `memory_*` tools + optional memory DB | **P0** |
| N8 | Kitsune-as-database for apps | MCP `define_collection` | OAuth-bound service principal path | **P0** |

---

## 3. What we keep (non-negotiable)

From existing Kitsune PRD / system design — still binding:

- Field-level change ops with base revision / change sets for agents.
- Single authorization path through the query compiler (extend predicates for page ACL).
- No `SELECT *`; compiled row predicates.
- Agents as first-class principals; propose ceiling unless admin grants write.
- Postgres schema-per-workspace tenancy.

Page ACL and agent tokens must compile into the **same** grant/query path, not a second ad-hoc filter in the Next.js app only.

---

## 4. Implementation plan (this branch)

### Phase A — Foundations (this iteration)

1. **Workspaces API + switcher**
   - `GET /api/workspaces` — memberships for current user
   - `POST /api/workspaces` — create additional workspace (provision)
   - `POST /api/workspaces/switch` — set active `users.workspace_id` / `principal_id`
   - Sidebar workspace switcher component

2. **Page visibility + shares**
   - Migration: `visibility` on pages metadata table **or** side table `kitsune.page_acl` keyed by `(workspace_id, collection, record_id)`
   - Prefer control-plane table to avoid per-collection DDL churn:
     `kitsune.page_access (workspace_id, collection_id, record_id, visibility, owner_principal_id)`
     `kitsune.page_shares (…, grantee_principal_id, capability)`
   - Enforce in list/get/search SQL helpers
   - UI: Share dialog on page (Private / Workspace / People / Teams)

3. **Agent profiles**
   - `GET/POST /api/agents`, `POST /api/agents/[id]/tokens`
   - Settings → Agents UI
   - Bind API keys to agent principal (existing `api_keys` table)

### Phase B — Editor, memory, OAuth

4. TipTap editor for prose fields on `/p/[id]`
5. MCP tools `memory_search`, `memory_get`, `memory_related`, `memory_remember`
6. OAuth application tables + authorize + token + create database scope

### Phase C — Graph

7. `/graph` force-directed view + `GET /api/graph`

---

## 5. Evidence of current gaps (code)

| Area | Evidence |
|------|----------|
| No switcher | No matches for `WorkspaceSwitcher` / `switchWorkspace` under `apps/app` |
| Memberships exist | `packages/core/src/org/memberships.ts`, migration `workspace_memberships` |
| Active WS = user pointer | `apps/app/src/lib/require-workspace.ts` `pickMembership` |
| Editor | Prose → textarea (`field-control` / page view) |
| Graph UI | Spec: list links only; acceptance `search-graph` tests API neighbors |
| OAuth apps | No app registry for third-party DB creation |

---

## 6. Definition of done for the goal

Goal is complete when:

1. PRD + this gap doc are in `docs/`.
2. N1–N3, N5, N7, N4b/N8 are implemented with tests or manual verification evidence.
3. N6 graph UI + API at least MVP.
4. Gap matrix rows for those IDs read **shipped** or **MVP shipped** with file references.

Until then the goal stays open.
