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
ng serve                        # dev server on :4300
ng build                        # production build — use to verify CSS is correct
npm run generate:api            # regenerates frontend/src/generated/ from gateway swagger (gateway must be running)
npm run generate:icons          # regenerates SVG icon sprite

# Backend (workdir: member-api/ or api-gateway/)
dotnet run                      # starts the service; auto-migrates + seeds on first run
```

No lint/test commands are wired into CI. Run `ng build` as the primary verification step.

---

## Angular package versions — CRITICAL

All `@angular/*` and `@angular-devkit/*` packages **must be pinned to exact `21.2.7`** (no `^` or `~`).  
`@angular/build` and `@angular/cli` only reach `21.2.7` while other packages go to `21.2.9`, causing peer-dep conflicts.  
`npm install` works without `--legacy-peer-deps` only when all are pinned at the same exact version.

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

## Detailed instructions

`frontend/copilot-instructions.md` contains extended UI patterns, component APIs, and common fixes.  
Read it before making broad frontend changes. Note: some sections are outdated (Tailwind v3 references, lazy getter `formState` pattern) — trust this `AGENTS.md` and the source files over that doc when they conflict.
