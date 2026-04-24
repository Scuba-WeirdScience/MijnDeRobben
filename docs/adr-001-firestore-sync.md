# ADR-001: Firestore Document Shapes Must Stay in Sync

## Status
Accepted

## Context

Firestore is schemaless — it will silently accept a document that is missing fields
defined in our TypeScript interfaces. This means a breaking change to a shared type
(e.g. `MemberDoc`, `UserDoc`) will compile-error in Cloud Functions but **will not
fail at runtime in Firestore writes** that are missing the new field. The gap surfaces
later as `undefined` values in the frontend or unexpected Cloud Function behaviour.

This has already caused one production-like incident: adding `email` to `MemberDoc`
broke the functions build (correct), but the seed script and `onUserCreated` trigger
were not updated in the same commit, leading to member documents missing the field.

## Decision

**Every location that writes a full Firestore document must be updated atomically
whenever the corresponding TypeScript interface changes.**

The authoritative list of write locations per collection:

| Collection  | Write locations |
|-------------|----------------|
| `members/`  | `functions/src/auth/auth.functions.ts` → `onUserCreated` |
|             | `functions/src/members/members.functions.ts` → `createMember` |
|             | `scripts/seed-emulator.ts` → `SEED_USERS` loop |
| `users/`    | `functions/src/auth/auth.functions.ts` → `onUserCreated` |
|             | `functions/src/members/members.functions.ts` → `createMember` |
|             | `scripts/seed-emulator.ts` → `SEED_USERS` loop |

### Rules

1. **When adding a field to `MemberDoc` or `UserDoc` in `functions/src/shared/types.ts`:**
   - Add the field to **all** write locations in the table above in the same commit.
   - The TypeScript compiler will catch missing fields in functions — treat any
     `TS2741` ("Property X is missing") error as a hard blocker.
   - The seed script is plain TypeScript but is **not** compiled by `tsc` as part of
     `npm run build` — manually verify it after every interface change.

2. **The seed script (`scripts/seed-emulator.ts`) is the reference implementation.**
   It must always produce a document that is 100% identical in shape to what
   `createMember` produces, with real values (not placeholder stubs like
   `dateOfBirth: '1900-01-01'`).

3. **`onUserCreated` writes a stub document** (empty name, placeholder DOB) because
   it fires before the admin has filled in the member's details. This is intentional.
   `createMember` immediately overwrites it with real data. The stub must still
   satisfy the full `MemberDoc` shape so the TypeScript compiler validates it.

4. **Partial updates (`update()` / `{ merge: true }`)** do not need to include every
   field — only full `set()` calls without `merge` are subject to this rule.

5. **Frontend `Member` interface** (`frontend/src/app/features/members/services/member.service.ts`)
   must mirror `MemberDoc` exactly (minus server-only internals). Update it in the
   same commit as the backend type.

## Consequences

- Slightly more ceremony when adding fields, but no silent data gaps.
- The compiler is the primary safety net for functions; the seed must be reviewed
  manually on every `MemberDoc` / `UserDoc` change.
- New fields should have a safe default (e.g. `[]`, `null`, `false`) so existing
  Firestore documents that pre-date the field do not break reads.
