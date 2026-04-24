/**
 * reset-unread-counts.ts
 *
 * One-off cleanup script that resets `unreadPerGroep` and `unreadCount`
 * for all users in Firestore. Used to clear stale unread counters left
 * over from the old nieuwBerichten system.
 *
 * Run with:
 *   npx ts-node --esm scripts/reset-unread-counts.ts
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

async function main(): Promise<void> {
  console.log('Starting reset of unread counts for all users...');

  const usersSnap = await db.collection('users').get();
  console.log(`Found ${usersSnap.docs.length} user documents.`);

  if (usersSnap.empty) {
    console.log('No users found. Nothing to do.');
    return;
  }

  let batch: WriteBatch = db.batch();
  let batchCount = 0;
  let totalUpdated = 0;

  for (const userDoc of usersSnap.docs) {
    batch.update(userDoc.ref, {
      unreadPerGroep: {},
      unreadCount: 0,
    });
    batchCount++;

    if (batchCount >= BATCH_SIZE) {
      await batch.commit();
      totalUpdated += batchCount;
      console.log(`  Committed batch of ${batchCount} updates (total so far: ${totalUpdated})`);
      batch = db.batch();
      batchCount = 0;
    }
  }

  if (batchCount > 0) {
    await batch.commit();
    totalUpdated += batchCount;
  }

  console.log(`\nReset complete. Updated ${totalUpdated} user documents.`);
}

main().catch(e => {
  console.error('Reset failed:', e);
  process.exit(1);
});
