/**
 * delete-nieuw-berichten.ts
 *
 * One-off cleanup script that deletes ALL documents in the `nieuwBerichten`
 * Firestore collection, including their subcollections (`replies`, `lezingen`).
 *
 * Run with:
 *   npx ts-node --esm scripts/delete-nieuw-berichten.ts
 */

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, WriteBatch } from 'firebase-admin/firestore';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const serviceAccount = require('../service-account.json');

if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount),
    projectId: 'dcderobben-d3536',
  });
}

const db = getFirestore();
const BATCH_SIZE = 500;

async function deleteCollection(collectionPath: string): Promise<number> {
  const snap = await db.collection(collectionPath).get();
  if (snap.empty) return 0;

  let batch: WriteBatch = db.batch();
  let batchCount = 0;
  let totalDeleted = 0;

  for (const doc of snap.docs) {
    batch.delete(doc.ref);
    batchCount++;

    if (batchCount >= BATCH_SIZE) {
      await batch.commit();
      totalDeleted += batchCount;
      batch = db.batch();
      batchCount = 0;
    }
  }

  if (batchCount > 0) {
    await batch.commit();
    totalDeleted += batchCount;
  }

  return totalDeleted;
}

async function main(): Promise<void> {
  console.log('Starting cleanup of nieuwBerichten collection...');

  const berichtenSnap = await db.collection('nieuwBerichten').get();
  console.log(`Found ${berichtenSnap.docs.length} documents in nieuwBerichten.`);

  let totalDeleted = 0;

  for (const berichtDoc of berichtenSnap.docs) {
    const docId = berichtDoc.id;
    const basePath = `nieuwBerichten/${docId}`;

    const repliesDeleted = await deleteCollection(`${basePath}/replies`);
    if (repliesDeleted > 0) {
      console.log(`  [${docId}] Deleted ${repliesDeleted} replies.`);
    }

    const lezingenDeleted = await deleteCollection(`${basePath}/lezingen`);
    if (lezingenDeleted > 0) {
      console.log(`  [${docId}] Deleted ${lezingenDeleted} lezingen.`);
    }

    await berichtDoc.ref.delete();
    totalDeleted++;
    console.log(`  Deleted document ${docId} (${totalDeleted}/${berichtenSnap.docs.length})`);
  }

  console.log(`\nCleanup complete. Deleted ${totalDeleted} nieuwBerichten documents.`);
}

main().catch(e => {
  console.error('Cleanup failed:', e);
  process.exit(1);
});
