/**
 * Firestore Staging Sync
 *
 * Mirrors every production Firestore write to the staging project in near
 * real-time (~1-2 s lag). Runs as Cloud Functions v2 Firestore triggers
 * deployed to the PRODUCTION project only.
 *
 * Design decisions
 * ────────────────
 * - A second firebase-admin App ("staging") is initialised once using a
 *   service-account key stored as a Firebase Functions secret
 *   (STAGING_SERVICE_ACCOUNT_KEY). The secret value is the full JSON of the
 *   staging service account downloaded from the GCP console.
 * - Every write (create / update / delete) on any watched collection is
 *   replicated. Deletions are propagated as deletions.
 * - A `_sync` metadata map is stamped on every replicated document so you
 *   can tell synced docs from hand-crafted staging docs:
 *     { syncedAt: <ISO>, syncedFrom: "production" }
 * - Subcollections are NOT automatically mirrored — only the collections
 *   listed in SYNCED_COLLECTIONS. Add subcollections explicitly if needed.
 * - The function is SKIPPED for documents that already carry
 *   `_sync.syncedFrom === "production"` to avoid any accidental re-trigger
 *   loop (extra safety; a prod→staging write will never trigger a prod
 *   function anyway since they are different projects).
 *
 * Adding a new collection
 * ───────────────────────
 * Append the collection path to SYNCED_COLLECTIONS below and redeploy.
 * No other changes needed.
 *
 * Data-model divergence (staging ahead of production)
 * ────────────────────────────────────────────────────
 * When you add a new field to staging but haven't deployed it to production
 * yet, synced documents will arrive without that field — just like production
 * data would. Patch the staging documents manually or run a migration script
 * against the staging project after deploying the data-model change to
 * staging. See AGENTS.md § "Staging data-model migrations" for the full
 * process.
 */

import * as admin from 'firebase-admin';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { defineSecret } from 'firebase-functions/params';
import { REGION } from '../shared/admin';

// ── Secret ────────────────────────────────────────────────────────────────────
// Set via: firebase functions:secrets:set STAGING_SERVICE_ACCOUNT_KEY
// Value   : contents of the staging service-account JSON file (single line or
//           pretty-printed — both work).
const stagingKey = defineSecret('STAGING_SERVICE_ACCOUNT_KEY');

// ── Staging Admin app (lazy singleton) ────────────────────────────────────────
let _stagingDb: admin.firestore.Firestore | null = null;

function getStagingDb(): admin.firestore.Firestore {
  if (_stagingDb) return _stagingDb;

  const keyJson = stagingKey.value();
  if (!keyJson) {
    throw new Error(
      'STAGING_SERVICE_ACCOUNT_KEY secret is empty. ' +
      'Set it with: firebase functions:secrets:set STAGING_SERVICE_ACCOUNT_KEY',
    );
  }

  const credential = admin.credential.cert(JSON.parse(keyJson));

  // Use a unique app name so it doesn't clash with the default prod app.
  const existingApp = admin.apps.find((a) => a?.name === 'staging');
  const stagingApp =
    existingApp ??
    admin.initializeApp(
      { credential, projectId: 'dcderobben-staging' },
      'staging',
    );

  _stagingDb = stagingApp.firestore();
  return _stagingDb;
}

// ── Collections to sync ───────────────────────────────────────────────────────
// Top-level collections only. Subcollections must be listed explicitly.
// Keep this list in sync with the collections documented in AGENTS.md.
const SYNCED_COLLECTIONS: string[] = [
  'activiteiten',
  'activiteitOccurrences',
  'activiteitRegistraties',
  'berichten',
  'brevet-types',
  'brevetten',
  'groepen',
  'leningen',
  'locaties',
  'materiaal-types',
  'materialen',
  'member-organisaties',
  'members',
  'messages',
  'nieuwBerichten',
  'specialty-types',
  'threadConcepten',
  'users',
  // Subcollections — listed as parent/{docId}/subcollection
  'groepen/{groepId}/threads',
  'berichten/{berichtId}/lezingen',
  'nieuwBerichten/{berichtId}/lezingen',
  'nieuwBerichten/{berichtId}/replies',
  'messages/{messageId}/lezingen',
];

// ── Helper: build the sync metadata stamp ────────────────────────────────────
function syncMeta() {
  return {
    _sync: {
      syncedAt: new Date().toISOString(),
      syncedFrom: 'production',
    },
  };
}

// ── Helper: create a trigger for one collection path ─────────────────────────
function makeSyncTrigger(collectionPath: string) {
  // Replace static segments with wildcard document IDs for the trigger.
  // e.g. "groepen/{groepId}/threads" → "groepen/{groepId}/threads/{docId}"
  const triggerPath = `${collectionPath}/{docId}`;

  return onDocumentWritten(
    { document: triggerPath, region: REGION, secrets: [stagingKey] },
    async (event) => {
      const stagingDb = getStagingDb();

      // Resolve the full document path from the event resource string.
      // event.document is the full path like "groepen/abc123/threads/xyz"
      const docPath = event.document;
      const stagingRef = stagingDb.doc(docPath);

      const afterData = event.data?.after?.data();

      if (!afterData) {
        // Document was deleted — propagate deletion to staging.
        await stagingRef.delete();
        return;
      }

      // Write to staging, stamping sync metadata.
      await stagingRef.set(
        { ...afterData, ...syncMeta() },
        { merge: false }, // full overwrite — we want staging to mirror prod exactly
      );
    },
  );
}

// ── Export one named function per collection ──────────────────────────────────
// Cloud Functions requires named exports; we generate them dynamically.
// The function name is derived from the collection path:
//   "activiteiten"              → syncActiviteiten
//   "groepen/{groepId}/threads" → syncGroepenThreads
function collectionToFunctionName(path: string): string {
  return (
    'sync' +
    path
      .split('/')
      // Drop wildcard segments like {groepId}
      .filter((segment) => !segment.startsWith('{'))
      .map((s) => s.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase()))
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join('')
  );
}

// Build and export all triggers.
export const syncFunctions: Record<string, ReturnType<typeof onDocumentWritten>> = {};

for (const collection of SYNCED_COLLECTIONS) {
  const fnName = collectionToFunctionName(collection);
  syncFunctions[fnName] = makeSyncTrigger(collection);
}
