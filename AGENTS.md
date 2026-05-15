# AGENTS.md — De Robben

Quick-ramp context for AI agents. Only non-obvious facts are listed.

---

## Repo layout

```
api-gateway/    ASP.NET Core 9 + YARP + JWT + ASP.NET Identity  →  :5238
member-api/     ASP.NET Core 9 + EF Core + SQL Server           →  :5107
frontend/       Angular 21 SPA (standalone, signals)            →  :4300
migrations/     Hand-written SQL scripts (no EF migrations CLI)
```

`start-dev.ps1` opens all three services + OpenCode in Windows Terminal tabs.

---

## Dev commands

```powershell
# Frontend (workdir: frontend/)
npx ng serve                          # dev server on :4300 (local backend)
npx ng serve --configuration=staging-local  # dev server on :4300 (staging Firebase backend, HMR enabled)
npx ng build                        # production build — use to verify CSS is correct
pnpm run generate:api           # regenerates frontend/src/generated/ from gateway swagger (gateway must be running)
pnpm run generate:icons         # regenerates SVG icon sprite
pnpm run generate:release-notes # parses CHANGELOG.md → release-notes.json + syncs app-version meta tag

# Backend (workdir: member-api/ or api-gateway/)
dotnet run                      # starts the service; auto-migrates + seeds on first run
```

**Always use `npx ng` instead of `ng` directly** — `ng` is not on the global PATH.

To start a dev server in a new PowerShell window (never use `wt`):
```powershell
Start-Process pwsh -ArgumentList '-NoExit', '-Command', 'Set-Location ''C:\Projects\DeRobben\frontend''; npx ng serve'
```

No lint/test commands are wired into CI. Run `npx ng build` as the primary verification step.

---

## Angular package versions — CRITICAL

All `@angular/*` and `@angular-devkit/*` packages **must be pinned to exact `21.2.7`** (no `^` or `~`).  
`@angular/build` and `@angular/cli` only reach `21.2.7` while other packages go to `21.2.9`, causing peer-dep conflicts.  
`pnpm install` works without issues only when all are pinned at the same exact version.

---

## Tailwind CSS v4

The project uses **Tailwind v4** (not v3). Key differences from v3:

- **No `tailwind.config.js`** — config is CSS-first in `src/styles.css` via `@theme`, `@plugin`, `@variant`.
- **PostCSS config must be `postcss.config.json`** (not `.js`). Angular's esbuild builder silently ignores `.js`.
- **Dark mode**: `@variant dark (&:where(.dark, .dark *));` in `styles.css` — not `darkMode: 'class'` in a JS config.
- **`@tailwindcss/forms`**: loaded via `@plugin "@tailwindcss/forms";` in CSS, not `require()`.
- **`@source inline()` does NOT work for variant prefixes** (`focus:`, `dark:`, `hover:`, etc.). Brace-expansion only handles plain class name segments.

### Safelisting dynamic classes

Classes built inside Angular `computed()` are invisible to Tailwind's scanner. Safelist them as a plain TypeScript string array constant in the same `.ts` file — Tailwind scans `.ts` files as plain text:

```typescript
// In the component .ts file — do NOT remove
const _TW_SAFELIST = [
  'focus:outline-none', 'focus:ring-2', 'focus:ring-scuba-500',
  'hover:bg-scuba-700', 'dark:bg-scuba-600', 'disabled:opacity-50',
];
```

CSS comments are **not** scanned — only real source tokens work.

---

## Angular signal forms — injection context rule

`form()` from `@angular/forms/signals` calls `inject()` internally.  
**It must be called in the constructor or as a field initializer — never in a lazy getter or method.**

```typescript
// WRONG — NG0203 at runtime when template accesses the getter
private _formState: FieldTree<T> | null = null;
get formState() {
  if (!this._formState) this._formState = form(this.model, schema);
  return this._formState;
}

// CORRECT
readonly formState: FieldTree<T>;
constructor() {
  this.formState = form<T>(this.model, mySchema as any);
}
```

The `as any` cast is required because `z.coerce.number()` produces `ZodCoercedNumber`, incompatible with Angular's `Schema<T>`.

---

## Frontend conventions

- **All DSC components** imported from `src/app/shared/components/design-system.ts` — never import the component files directly.
- **Never write raw `<input>`, `<select>`, `<textarea>`** — always wrap in `<app-form-field>` + `<app-input>` / `<app-select>` / `<app-textarea>`.
- **All templates must be external files** (`templateUrl:`). Inline `template:` strings are not allowed.
- **`[class]` binding does not reliably apply Tailwind** — use `[ngClass]` for dynamic class strings.
- **No `@Input()` / `@Output()`** — use `input()`, `input.required()`, `output()` (Angular 21 signal API).
- **All forms use side panels**, not modals. Exception: delete confirmations use a small centered modal.
- **`<app-side-panel>`** uses `[class.max-w-*]` bindings for sizing — do not set width classes directly on it.
- **`<app-user-display>`** for all avatar/name blocks — never build them inline.
- **UI language is Dutch** (Belgian). All labels, toasts, placeholders, and error messages in Dutch.
- **`$any()` in templates** only works for DOM events (`$any($event.target).value`). Use TypeScript type assertions in `.ts` files.
- **Full-page list views** (e.g. Ledenbeheer, Groepenbeheer) follow one pattern: bordered `<table>` inside a rounded card, a plain search `<input>` above, and text action links ("Bewerken" / "Verwijderen") right-aligned in the last column. No icon buttons in list rows. Reference: `member-list.component.html`.
- **Components rendered inside `<app-side-panel>`** must NOT render a nested `<app-side-panel>` for sub-forms. Use an `@if`/`@else` swap to show the list or the form inline within the same panel.
- **No page-level scrollbar**: `html`, `body`, and `app-root` all have `overflow: hidden; height: 100%`. Fullscreen routes use `flex-1 min-h-0` on `<main>` (not `h-[calc(...)]`). Every flex child in the chain must have `min-h-0` to prevent overflow escape.

---

## Firestore document types — single source of truth

`frontend/src/app/core/models/firestore-types.ts` is the **canonical frontend mirror** of `functions/src/shared/types.ts`.
Every Firestore document shape is defined once and imported by all service files.

**When adding/removing fields on a Firestore document, update BOTH files:**
1. `functions/src/shared/types.ts` (backend — ground truth)
2. `frontend/src/app/core/models/firestore-types.ts` (frontend mirror, synced by the comment above each type)

Service files that previously defined their own types (`activiteiten.service.ts`, `member.service.ts`, `threads.service.ts`, `messages.service.ts`, `brevet.service.ts`, `brevet-type.service.ts`, `specialty-type.service.ts`, `materiaal.service.ts`, `lening.service.ts`) now import from `firestore-types.ts` and use type aliases where the local name differs from the canonical doc name.

---

## Generated files

`frontend/src/generated/` is fully auto-generated from the gateway's OpenAPI spec.  
**Do not edit these files manually** — they are overwritten by `npm run generate:api`.

---

## Backend conventions

- **No `dotnet ef migrations add` or `dotnet ef database update`**. All DB changes are hand-written SQL in `migrations/` and applied via `sqlcmd`.
- **EF entity config**: always specify both sides of a relationship in `*Configuration.cs` to prevent duplicate shadow FK columns (e.g. `MateriaalTypeId1`).
- **Auth**: member-api trusts `X-User-Id` / `X-User-Email` headers injected by the gateway — it does not validate JWTs directly.
- **Roles**: `Beheer` | `Lid` | `Bestuur` | `MateriaalCommissie` | `InstructieKader`.

---

## Firestore document sync — CRITICAL (see `docs/adr-001-firestore-sync.md`)

Firestore is schemaless and will silently accept incomplete documents. **Every time
you add or remove a field on `MemberDoc` or `UserDoc` in `functions/src/shared/types.ts`,
you must update ALL of these locations in the same change:**

| What to update | File |
|----------------|------|
| `members/` full writes | `functions/src/auth/auth.functions.ts` → `onUserCreated` |
| | `functions/src/members/members.functions.ts` → `createMember` |
| | `scripts/seed-emulator.ts` → member set block |
| `users/` full writes | `functions/src/auth/auth.functions.ts` → `onUserCreated` |
| | `functions/src/members/members.functions.ts` → `createMember` |
| | `scripts/seed-emulator.ts` → user set block |
| Frontend interface | `frontend/src/app/features/members/services/member.service.ts` → `Member` |

- The TypeScript compiler catches missing fields in functions (`TS2741`) — treat these as hard blockers.
- The seed script is **not** compiled by `tsc` — verify it manually after every interface change.
- Partial `update()` calls and `set(..., { merge: true })` with only changed fields are exempt.

---

## PWA deployment — CRITICAL

**Every time you deploy the frontend, you must bump the `version` in `frontend/ngsw-config.json`**
before running `ng build`. Use semantic versioning (`2.1.0` → `2.2.0`, etc.).

Without this bump, users whose service worker is already active will not receive the update
notification and will keep running the old cached version indefinitely.

Steps (always in this order):
1. Bump `appData.version` in `frontend/ngsw-config.json`
2. `ng build` (workdir: `frontend/`)
3. `firebase deploy --only hosting` (or `hosting,functions` if functions also changed)

---

## Staging environment (`dcderobben-staging`)

A second Firebase project mirrors production data for local debugging without running
local emulators. Data flows **production → staging** automatically.

### How the sync works

| Mechanism | When | What |
|-----------|------|------|
| **Real-time Cloud Function triggers** | Every production write | Mirrors the write (~1-2 s lag) to staging via `functions/src/sync/firestore-sync.functions.ts` |
| **Firestore export/import** (CI) | Every production deploy | Full re-seed via `gcloud firestore export` + `import` in `.github/workflows/deploy.yml` |

The sync stamps `_sync: { syncedAt, syncedFrom: "production" }` on every replicated document.

### Running the frontend against staging

```powershell
# workdir: frontend/
ng serve --configuration=staging
# or build:
ng build --configuration=staging
```

### Adding a new collection to the real-time sync

1. Add the collection path to `SYNCED_COLLECTIONS` in
   `functions/src/sync/firestore-sync.functions.ts`.
2. Deploy functions: `firebase --project production deploy --only functions`.

### Staging data-model migrations — REQUIRED after every field change

When you add or remove a field on a Firestore document type and deploy to **production**,
the real-time sync will start writing documents with the new shape. However, **documents
already in staging** (synced before the deploy) will still have the old shape.

**After every production deploy that changes a document shape, you must:**

1. Write a migration script (same script you would run on production) targeting the
   staging project:
   ```typescript
   // Use the staging service account credential, not the default
   import stagingCred from './staging-sa.json';
   const stagingApp = admin.initializeApp({ credential: admin.credential.cert(stagingCred), projectId: 'dcderobben-staging' }, 'migration');
   const stagingDb = stagingApp.firestore();
   // ... your migration logic
   ```
2. Run against staging first to verify correctness.
3. Then run the identical script against production.

The CI export/import in `deploy.yml` will re-seed staging with the latest production
data after each deploy, automatically resolving any shape divergence for newly written
documents. Old documents that were not touched by the production deploy may still need
the manual migration.

### One-time manual setup for the staging sync (prerequisites)

These steps must be completed by a human before the sync activates:

1. **Enable billing** on `dcderobben-staging` at
   https://console.developers.google.com/billing/enable?project=dcderobben-staging

2. **Create the Firestore database** in staging (europe-west4):
   ```bash
   firebase --project staging firestore:databases:create --location=europe-west4
   ```

3. **Create a GCS export bucket** in the staging project:
   ```bash
   gsutil mb -p dcderobben-staging -l europe-west4 gs://dcderobben-staging-exports
   ```

4. **Grant the production service account Storage Admin** on the export bucket:
   ```bash
   gsutil iam ch serviceAccount:<PROD_SA_EMAIL>:roles/storage.admin \
     gs://dcderobben-staging-exports
   ```

5. **Grant the staging service account Firestore import rights**:
   ```bash
   gcloud projects add-iam-policy-binding dcderobben-staging \
     --member=serviceAccount:<STAGING_SA_EMAIL> \
     --role=roles/datastore.importExportAdmin
   ```

6. **Add GitHub Actions secrets**:
   - `FIREBASE_SERVICE_ACCOUNT_STAGING` — staging service account JSON

7. **Set the Functions secret** (enables real-time sync):
   ```bash
   firebase --project dcderobben-d3536 functions:secrets:set STAGING_SERVICE_ACCOUNT_KEY
   # paste the staging service account JSON when prompted
   ```

8. **Deploy functions** to activate the sync triggers:
   ```bash
   firebase --project dcderobben-d3536 deploy --only functions --force
   ```

---

## Detailed instructions

`frontend/copilot-instructions.md` contains extended UI patterns, component APIs, and common fixes.  
Read it before making broad frontend changes. Note: some sections are outdated (Tailwind v3 references, lazy getter `formState` pattern) — trust this `AGENTS.md` and the source files over that doc when they conflict.

---

## Agent skills

### Issue tracker

Issues live in **GitHub Issues** on `Scuba-WeirdScience/MijnDeRobben`. See `docs/agents/issue-tracker.md`.

- Create issues via `gh issue create` or the GitHub UI
- Reference issues in branch names and PR titles as `#[number]`

### Triage labels

Default five-role vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout — `CONTEXT.md` + `docs/adr/` at the repo root (neither exists yet; skills will proceed silently until created). See `docs/agents/domain.md`.

### Worktree workflow (gh-worktree skill)

Use the `gh-worktree` skill to start work on a GitHub Issue:

- Skill file: `.opencode/skills/gh-worktree/SKILL.md`
- Fetches the issue title from GitHub, derives a branch name (`feature/[issue-number]-[sanitized-title]`), and creates a worktree at `C:\Projects\feature-[issue-number]`
- Worktrees are placed **inside** `C:\Projects\DeRobben` (e.g. `C:\Projects\DeRobben\feature-[issue-number]`)
- Branch protection on `main` requires a PR — never push directly to `main`

### PR flow

1. Create a GitHub Issue for the work item (if one doesn't exist)
2. Run `gh-worktree` to create a worktree + branch
3. Implement, then push: `git push -u origin feature/[issue-number]-[sanitized-title]`
4. Open a PR: `gh pr create --title "..." --body "Closes #[issue-number]"`
5. PR requires: `build-frontend` + `build-functions` checks passing + 1 approval
