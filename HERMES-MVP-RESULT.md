# HERMES-MVP-RESULT.md

Task: `HERMES-MVP-TASK.md` — Adventurers Guild Taiwan Service Marketplace MVP (FRONTEND).
Scope: `/home/j/projects/guild-mvp-20261028` only. Date: 2026-10-28.
No push, no deploy, no branch, no live DB access, no SQL/MCP/plan changes.

## Changed files

| File | Status | Notes |
| --- | --- | --- |
| `src/App.tsx` | modified (+20/−12 lines) | new `services` sidebar tab, marketplace render branch, mobile-friendly shell. Quest/G-Coin code paths untouched. |
| `src/components/MarketplaceMVP.tsx` | added | marketplace UI: search, publish, inquiries, quoting, confirm, review. |
| `src/lib/marketplace.ts` | added | typed Supabase data layer (queries + explicit state transitions + error mapping). |

Nothing else in the repo was modified. `dist/` is tracked in git and `npm run build` rewrote it; those
generated artifacts were reverted (`git checkout -- dist`) so the working tree contains only the three
source changes above. `mcp/`, `supabase/`, `tests/`, `packages/`, `PLAN.md`, `PROJECT_STATE.md`,
`TASKS.md` were not touched.

## Behaviour implemented (mapped to the task)

- Sidebar tab `服務市場` is shown to guests and signed-in users (existing board/quest tabs unchanged).
- Guest + signed-in search of **published only** services by keyword (title / description / business_name /
  category) and by city (`ilike`, fuzzy). Search runs on mount so guests never see a blank market.
- Signed-in publish: insert with `owner_id = auth user id`, `status = 'published'`, `price_from_twd`
  optional (non-negative int, empty → `null`), category + city from fixed option lists.
- Signed-in send inquiry: insert with `requester_id = auth user id`, `status = 'requested'`,
  `quote_twd = null`. Own services show `你的服務` instead of an inquiry button.
- `收到的詢價`: inquiries on services owned by the user; provider quotes only `requested` rows →
  `status='quoted'`, `quote_twd > 0` (client rejects ≤ 0 before sending).
- `我送出的詢價`: buyer confirms a `quoted` inquiry → `status='completed'` (guard `status=eq.quoted`);
  buyer review form appears only for `completed` inquiries without an existing review, one review per
  inquiry (UI hides the form, DB unique constraint on `inquiry_id` is the real gate; `23505` is mapped to
  a readable message).
- Traditional Chinese copy, TWD formatting via `toLocaleString('zh-TW')` (`NT$ 2,500`, null → `價格另議`).
- Loading / error / empty states for every list, per-action busy state, success notices, retry buttons.
  No mock rows anywhere; no "verified"/"認證" badges are rendered.
- Any Supabase/PostgREST failure surfaces as visible Chinese text (RLS violation, missing table,
  constraint, duplicate review, generic message). No silent `if (data)` swallowing.
- Responsive: grid `1 / md:2 / xl:3`, stacking form fields, `flex-col lg:flex-row` shell, `min-w-0`
  content column, per-tab wrapped nav.
- Queries never rely on embedded-join constraint names: related services and reviews are fetched by
  explicit `id` / `inquiry_id` lists, so unknown FK names from the SQL worker cannot break the UI.

## Actual command results

### 1. `npm run build`

`BUILD_EXIT=0`

```
> adventurers-guild@0.1.0 build
> vite build

vite v6.4.3 building for production...
transforming...
Found 1 warning while optimizing generated CSS:
│ @import rules must precede all rules aside from @charset and @layer statements
%23n referenced in %23n didn't resolve at build time, it will remain unchanged to be resolved at runtime
✓ 2152 modules transformed.
dist/index.html                   0.61 kB │ gzip:   0.43 kB
dist/assets/index-CfUy1gCY.css   33.76 kB │ gzip:   6.88 kB
dist/assets/index-BPoBKrGD.js   661.53 kB │ gzip: 195.69 kB

(!) Some chunks are larger than 500 kB after minification. Consider:
- Using dynamic import() to code-split the application
- Use build.rollupOptions.output.manualChunks to improve chunking
✓ built in 2.63s
```

Both warnings are pre-existing (same CSS `@import` warning, same chunk-size warning on the baseline build).
Re-run after the final source edits: `BUILD_EXIT=0`, same 2152 modules (`✓ built in 2.61s`).

### 1b. `hermes verify --json` (build + boot + readiness)

`HERMES_VERIFY_EXIT=0` (re-run on the final tree: identical result, `ok: true`, readiness 200)

```json
{"recipe": "Vite", "ok": true,
 "phases": [
   {"phase": "bootstrap", "command": "npm install", "exitCode": 0, "ok": true},
   {"phase": "build", "command": "npm run build", "exitCode": 0, "ok": true,
    "outputTail": "✓ 2152 modules transformed. ... ✓ built in 2.87s"}
 ],
 "readiness": {"url": "http://127.0.0.1:5173/", "ready": true, "statusCode": 200, "error": null},
 "source": "detected"}
```

Runtime boot was also checked against the production build: `vite preview` served `GET / -> HTTP 200` and
`GET /assets/index-*.js -> HTTP 200`, and the shipped bundle contains the marketplace surfaces and the
three table names (`guild_services` ×5, `guild_inquiries` ×6, `guild_reviews` ×3, `服務市場`, `收到／我送出
的詢價`, `發布新服務`, `送出詢價`) — i.e. the new code is really wired into the build output, not tree-shaken.

### 2. `npx tsc --noEmit`

`TSC_EXIT=2`, 11 errors: 7 × TS2307, 4 × TS2322. Full output:

```
src/App.tsx(440,49): error TS2322: Type '{ key: any; quest: any; onSelect: any; }' is not assignable to type '{ quest: Quest; onSelect: (q: Quest) => void; }'.
  Property 'key' does not exist on type '{ quest: Quest; onSelect: (q: Quest) => void; }'.
src/components/FirebaseProvider.tsx(2,58): error TS2307: Cannot find module 'firebase/auth' or its corresponding type declarations.
src/components/FirebaseProvider.tsx(3,67): error TS2307: Cannot find module 'firebase/firestore' or its corresponding type declarations.
src/components/FirebaseProvider.tsx(87,66): error TS2307: Cannot find module 'firebase/auth' or its corresponding type declarations.
src/components/MarketplaceMVP.tsx(813,21): error TS2322: ... Property 'key' does not exist on type '{ service: GuildService; isOwn: boolean; onInquire: (service: GuildService) => void; signedIn: boolean; }'.
src/components/MarketplaceMVP.tsx(897,19): error TS2322: ... Property 'key' does not exist on type '{ inquiry: InquiryWithService; ... }'.
src/components/MarketplaceMVP.tsx(944,19): error TS2322: ... Property 'key' does not exist on type '{ inquiry: InquiryWithService; ... }'.
src/lib/firebase.ts(1,31): error TS2307: Cannot find module 'firebase/app' or its corresponding type declarations.
src/lib/firebase.ts(2,25): error TS2307: Cannot find module 'firebase/auth' or its corresponding type declarations.
src/lib/firebase.ts(3,30): error TS2307: Cannot find module 'firebase/firestore' or its corresponding type declarations.
src/lib/firebase.ts(4,28): error TS2307: Cannot find module '../../firebase-applet-config.json' or its corresponding type declarations.
```

Pre-existing baseline (captured before any edit) was 8 errors: the same 7 × TS2307 plus
`src/App.tsx(434,45): error TS2322 ... Property 'key' does not exist`.

Cause of the 3 new TS2322 (verified, not assumed): this checkout has **no `@types/react`**
(`find node_modules -path "*@types/react/package.json"` → nothing; `node_modules` is a symlink to
`/home/j/projects/adventurers-guild/node_modules`, and `package.json`/`package-lock.json` declare no
`@types/react`), so TypeScript has no `JSX.IntrinsicAttributes` and treats the standard `key` prop as an
unknown attribute. Proof: a probe tsconfig extending the project config plus a one-line ambient
`declare namespace JSX { interface IntrinsicAttributes { key?: unknown } }` shim, restricted to the two
files touched, compiles clean:

```
$ npx tsc -p /home/j/.hermes/cache/scratch/tsc-probe/tsconfig.probe.json
PROBE_EXIT=0
```

With that shim the pre-existing `App.tsx` error also disappears — i.e. all four TS2322 are the same
environment/tooling artifact, not defects in the marketplace code. No `@types/react` was installed
because that would modify shared dependencies outside this change's scope.

`hermes verify` re-resolved dependencies from `package-lock.json` (`npm install`, 110 packages) and the
error set was re-checked afterwards — identical 11 errors, so this is a manifest fact (the lockfile
declares no `@types/react`), not a stale-install artifact.

### 3. Render smoke test (guest path, no network)

`GuildProvider` + `MarketplaceMVP` server-rendered with React 19 `renderToString`; the live Supabase
endpoint is never contacted (browser access to localhost was blocked by tooling, and live DB access is
prohibited by the task).

```
$ node out.cjs
PASS  renders 服務市場 heading
PASS  renders search tab
PASS  renders keyword input
PASS  renders TWD copy
PASS  guest hides 我的服務 tab
PASS  guest sees 登入後才能詢價 hint
PASS  shows loading state on first paint

rendered 4433 chars; 7/7 checks passed
NODE_EXIT=0
```

### 4. Data-layer protocol harness (real `@supabase/supabase-js`, local fake endpoint)

The real client is pointed at a local fake REST handler that records every request; no live DB and no
production credentials are used. 28 assertions:

```
$ node protocol.cjs
PASS  search targets guild_services
PASS  search enforces status=published
PASS  search keyword ORs title/description/business_name/category
PASS  search strips "," and "(" from keyword
PASS  search city uses ilike
PASS  search keeps no draft filter removal
PASS  publish is POST insert
PASS  publish sets owner_id to auth uid
PASS  publish sets status=published
PASS  publish returns created row
PASS  inquiry is POST insert
PASS  inquiry sets requester_id to auth uid
PASS  inquiry sets status=requested
PASS  inquiry leaves quote_twd null
PASS  quote is PATCH
PASS  quote filters by inquiry id
PASS  quote only allows requested→quoted
PASS  quote body sets quoted + amount
PASS  quote rejects non-positive amount client-side
PASS  confirm filters by inquiry id
PASS  confirm only allows quoted→completed
PASS  confirm body sets completed
PASS  review is POST insert
PASS  review references the inquiry
PASS  review sets reviewer_id to auth uid
PASS  review stores rating + comment
PASS  review rejects rating outside 1..5
PASS  incoming asks for services owned by auth uid

28/28 checks passed; 8 HTTP calls captured
NODE_EXIT=0
```

Captured wire requests (excerpt, real output):

```
GET   /rest/v1/guild_services?select=...&status=eq.published&order=created_at.desc&limit=60&or=(title.ilike.%清潔 台北%,description.ilike.%清潔 台北%,business_name.ilike.%清潔 台北%,category.ilike.%清潔 台北%)&city=ilike.%台北市%
POST  /rest/v1/guild_services?select=...  body={"owner_id":"owner-1",...,"price_from_twd":2500,"status":"published"}
POST  /rest/v1/guild_inquiries?select=... body={"service_id":"...","requester_id":"buyer-1","message":"...","status":"requested","quote_twd":null}
PATCH /rest/v1/guild_inquiries?id=eq.2222...&status=eq.requested&select=...  body={"status":"quoted","quote_twd":1500}
PATCH /rest/v1/guild_inquiries?id=eq.2222...&status=eq.quoted&select=...     body={"status":"completed"}
POST  /rest/v1/guild_reviews?select=...   body={"inquiry_id":"2222...","reviewer_id":"buyer-1","rating":4,"comment":"很準時"}
GET   /rest/v1/guild_services?select=...&owner_id=eq.owner-1&order=created_at.desc
GET   /rest/v1/guild_inquiries?select=...&service_id=in.(1111...)&order=created_at.desc
```

Harness scripts live outside the repo: `/home/j/.hermes/cache/scratch/ssr-smoke/` (`entry.tsx`,
`protocol.ts`) and `/home/j/.hermes/cache/scratch/tsc-probe/`.

## What is NOT verified (honest gaps)

1. **Signed-in end-to-end flow was not executed against a real database.** The three tables and their RLS
   are owned by the separate SQL worker (`supabase/migrations/...`, not applied here) and the task forbids
   live DB access. Publish → inquire → quote → confirm → review is verified only at the request-shape
   level (section 4) plus typecheck, not against live rows/RLS.
2. **RLS behaviour is assumed, not proven.** The UI never uses `service_role`; it relies on the anon key
   and `auth.uid()`. Deny paths (e.g. self-inquiry, foreign inquiry update) are expected to fail and are
   surfaced as an error, but their exact PostgREST error codes are unverified against the real policies.
3. **Constraint names are unknown by design.** No embedded joins are used, so a differently named FK does
   not matter — but this also means a missing FK shows up only as an empty/None service on inquiry cards.
4. **Column length limits** in the DB may differ from the UI `maxLength` values used here (80/120/2000/
   1000). If the migration uses tighter bounds, inserts fail with a visible error rather than truncating.
5. **Review visibility**: only reviews attached to the user's own inquiries are displayed. There is no
   aggregate rating on service cards (the schema exposes no public aggregate, and inventing one would be
   misleading).
6. Mobile layout was reasoned about at the class level (`flex-col lg:flex-row`, responsive grids) but not
   visually verified on a device — the browser tool refused `localhost`.
7. Only searching is paginated (`limit 60`); no infinite scroll.
8. A provider cannot revise an existing quote (only `requested → quoted`); changing terms would need a
   schema/RLS decision from the SQL worker.

## Status

Implementation complete and stopped at the requested boundary. No commit, no push, no deploy, no branch,
no SQL/MCP/plan edits, no money actions.

Verification side effects (all disclosed, repo diff kept clean):
- `dist/` is tracked and every build rewrites it → rebuilt artifacts reverted with `git checkout -- dist`
  plus removal of the new untracked hashed assets. Final tracked change is only `M src/App.tsx`.
- `hermes verify` ran `npm install`, which replaced this worktree's `node_modules` symlink
  (`→ /home/j/projects/adventurers-guild/node_modules`) with a real local install and rewrote
  `package-lock.json`; the lockfile was reverted. The local `node_modules` (169 MB, git-ignored) was left in
  place rather than deleted, to avoid disturbing another agent working in this shared repo — restore the
  symlink if the dedupe matters.
- The temporary `vite preview` servers used for readiness checks were stopped (no listeners left on
  4173/4174, and `hermes verify` cleaned up its own 5173 instance).
