/**
 * seed-staging.ts
 *
 * Copies all Firestore data + Auth users from production to staging.
 *
 * Run: node --loader ts-node/esm seed-staging.ts
 * (from the scripts/ directory)
 */

import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── App init ──────────────────────────────────────────────────────────────────

const prodCred = JSON.parse(
  readFileSync(resolve(__dirname, '../service-account.json'), 'utf8'),
);

const adcPath = `${process.env['APPDATA']}/firebase/YOUR_FIREBASE_ADC_FILENAME_application_default_credentials.json`;
// Point GOOGLE_APPLICATION_CREDENTIALS to the Firebase CLI ADC file so staging app can use it
process.env['GOOGLE_APPLICATION_CREDENTIALS'] = adcPath;

const prodApp = admin.initializeApp(
  { credential: admin.credential.cert(prodCred), projectId: 'dcderobben-d3536' },
  'production',
);

const stagingApp = admin.initializeApp(
  { credential: admin.credential.applicationDefault(), projectId: 'dcderobben-staging' },
  'staging',
);

const prodDb = admin.firestore(prodApp);
const stagingDb = admin.firestore(stagingApp);
const prodAuth = admin.auth(prodApp);
const stagingAuth = admin.auth(stagingApp);

// ── Collections to copy ───────────────────────────────────────────────────────

// Top-level collections to mirror (same list as firestore-sync.functions.ts)
const TOP_LEVEL_COLLECTIONS = [
  'members',
  'users',
  'groepen',
  'berichten',
  'nieuwBerichten',
  'threads',
  'messages',
  'activiteiten',
  'inschrijvingen',
  'brevetTypes',
  'specialtyTypes',
  'materiaalTypes',
  'materiaal',
  'leningen',
];

// Subcollections to copy per parent collection (parentCollection -> subcollection names)
const SUBCOLLECTIONS: Record<string, string[]> = {
  berichten: ['lezingen'],
  nieuwBerichten: ['lezingen'],
  messages: ['lezingen'],
};

// Groepen has a threads subcollection with messages subcollections inside
const GROEPEN_SUBCOLLECTIONS = ['threads'];

// ── Helpers ───────────────────────────────────────────────────────────────────

const BATCH_SIZE = 400;

async function writeBatch(
  db: admin.firestore.Firestore,
  writes: { ref: admin.firestore.DocumentReference; data: admin.firestore.DocumentData }[],
): Promise<void> {
  for (let i = 0; i < writes.length; i += BATCH_SIZE) {
    const chunk = writes.slice(i, i + BATCH_SIZE);
    const batch = db.batch();
    for (const { ref, data } of chunk) {
      batch.set(ref, data);
    }
    await batch.commit();
  }
}

async function copyCollection(
  prodRef: admin.firestore.CollectionReference,
  stagingRef: admin.firestore.CollectionReference,
  subcollectionNames: string[] = [],
): Promise<number> {
  const snap = await prodRef.get();
  if (snap.empty) return 0;

  const writes = snap.docs.map((d) => ({
    ref: stagingRef.doc(d.id),
    data: d.data(),
  }));

  await writeBatch(stagingDb, writes);

  // Copy subcollections
  for (const subName of subcollectionNames) {
    for (const docSnap of snap.docs) {
      await copyCollection(
        prodRef.doc(docSnap.id).collection(subName),
        stagingRef.doc(docSnap.id).collection(subName),
      );
    }
  }

  return snap.size;
}

// ── Auth copy ────────────────────────────────────────────────────────────────

async function copyAuth(): Promise<void> {
  console.log('\n── Auth users ─────────────────────────────────────────────');

  let pageToken: string | undefined;
  let totalImported = 0;

  do {
    const result = await prodAuth.listUsers(1000, pageToken);
    pageToken = result.pageToken;

    if (result.users.length === 0) break;

    // Map to UserImportRecord
    const usersToImport: admin.auth.UserImportRecord[] = result.users.map((u) => ({
      uid: u.uid,
      email: u.email,
      emailVerified: u.emailVerified,
      displayName: u.displayName,
      photoURL: u.photoURL,
      phoneNumber: u.phoneNumber,
      disabled: u.disabled,
      // Include password hash if present — requires hash config below
      passwordHash: u.passwordHash ? Buffer.from(u.passwordHash, 'base64') : undefined,
      passwordSalt: u.passwordSalt ? Buffer.from(u.passwordSalt, 'base64') : undefined,
      customClaims: u.customClaims,
      metadata: {
        creationTime: u.metadata.creationTime,
        lastSignInTime: u.metadata.lastSignInTime,
      },
      providerData: u.providerData,
    }));

    // Get hash config from production project
    const hashConfig = await (prodAuth as any).getPasswordHashParameters?.();

    let importResult: admin.auth.UserImportResult;
    if (hashConfig) {
      importResult = await stagingAuth.importUsers(usersToImport, { hash: hashConfig });
    } else {
      // Fall back: import without password hashes (users will need to reset passwords)
      const usersWithoutPasswords = usersToImport.map(({ passwordHash, passwordSalt, ...u }) => u);
      importResult = await stagingAuth.importUsers(usersWithoutPasswords);
    }

    totalImported += result.users.length - importResult.errors.length;

    if (importResult.errors.length > 0) {
      for (const err of importResult.errors) {
        console.warn(`  ⚠ User index ${err.index}: ${err.error.message}`);
      }
    }
  } while (pageToken);

  console.log(`  ✔ ${totalImported} users imported`);
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('🚀 Seeding staging Firestore from production...\n');

  // Auth — skip if not yet enabled on staging
  try {
    await copyAuth();
  } catch (err: any) {
    if (err?.errorInfo?.code === 'auth/configuration-not-found') {
      console.warn('  ⚠ Auth not yet enabled on staging — skipping user import.');
      console.warn('    Enable Email/Password auth at:');
      console.warn('    https://console.firebase.google.com/project/dcderobben-staging/authentication');
      console.warn('    Then re-run this script to import users.\n');
    } else {
      throw err;
    }
  }

  // 2. Firestore top-level collections
  console.log('\n── Firestore collections ──────────────────────────────────');
  for (const colName of TOP_LEVEL_COLLECTIONS) {
    const subcols = SUBCOLLECTIONS[colName] ?? [];
    const count = await copyCollection(
      prodDb.collection(colName),
      stagingDb.collection(colName),
      subcols,
    );
    console.log(`  ✔ ${colName}: ${count} docs`);
  }

  // 3. groepen/{id}/threads (nested subcollection not in top-level list)
  console.log('\n── Groepen threads ────────────────────────────────────────');
  const groepenSnap = await prodDb.collection('groepen').get();
  for (const groepDoc of groepenSnap.docs) {
    for (const subName of GROEPEN_SUBCOLLECTIONS) {
      const count = await copyCollection(
        prodDb.collection('groepen').doc(groepDoc.id).collection(subName),
        stagingDb.collection('groepen').doc(groepDoc.id).collection(subName),
      );
      if (count > 0) console.log(`  ✔ groepen/${groepDoc.id}/${subName}: ${count} docs`);
    }
  }

  console.log('\n✅ Staging seed complete!');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
