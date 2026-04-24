/**
 * migrate-berichten.ts
 *
 * Migration script for the group messaging feature.
 *
 * What it does:
 * 1. Creates an "Algemeen" groep containing all active member UIDs
 * 2. Bulk-updates all existing berichten: sets groepId = <algemeen_id>, status = 'gepubliceerd'
 * 3. For all user docs: adds unreadPerGroep: { [algemeen_id]: unreadCount }
 *    and keeps unreadCount for backwards compat
 *
 * Run with:
 *   npx ts-node --esm scripts/migrate-berichten.ts
 */

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
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

async function main(): Promise<void> {
  console.log('Starting berichten migration...');

  // ── Step 1: Collect all active member UIDs ─────────────────────────────────
  const membersSnap = await db.collection('members').where('isActive', '==', true).get();
  const memberUids: string[] = membersSnap.docs.map(d => {
    const data = d.data() as { userId?: string };
    return data.userId ?? d.id;
  });
  console.log(`Found ${memberUids.length} active members.`);

  // ── Step 2: Create "Algemeen" groep ────────────────────────────────────────
  const algemeenRef = db.collection('groepen').doc();
  await algemeenRef.set({
    id: algemeenRef.id,
    name: 'Algemeen',
    description: 'Algemeen kanaal voor alle leden',
    memberUids,
    createdBy: 'migration',
    createdAt: Timestamp.now(),
  });
  const algemeenId = algemeenRef.id;
  console.log(`Created "Algemeen" groep with id: ${algemeenId}`);

  // ── Step 3: Migrate existing berichten to nieuwBerichten ──────────────────
  const berichtenSnap = await db.collection('berichten').get();
  console.log(`Migrating ${berichtenSnap.docs.length} berichten...`);

  const BATCH_SIZE = 400;
  let batch = db.batch();
  let batchCount = 0;

  for (const berichtDoc of berichtenSnap.docs) {
    const data = berichtDoc.data() as {
      id?: string;
      onderwerp?: string;
      inhoud?: string;
      isPinned?: boolean;
      zenderId?: string;
      zenderNaam?: string;
      aangemaaktOp?: string;
    };

    const newRef = db.collection('nieuwBerichten').doc(berichtDoc.id);
    batch.set(newRef, {
      id: berichtDoc.id,
      groepId: algemeenId,
      authorUid: data.zenderId ?? '',
      authorName: data.zenderNaam ?? '',
      body: data.inhoud ?? data.onderwerp ?? '',
      status: 'gepubliceerd',
      pinnedAt: data.isPinned ? Timestamp.now() : null,
      createdAt: data.aangemaaktOp
        ? Timestamp.fromDate(new Date(data.aangemaaktOp))
        : Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    batchCount++;

    if (batchCount >= BATCH_SIZE) {
      await batch.commit();
      console.log(`  Committed batch of ${batchCount}`);
      batch = db.batch();
      batchCount = 0;
    }
  }
  if (batchCount > 0) {
    await batch.commit();
    console.log(`  Committed final batch of ${batchCount}`);
  }
  console.log('Berichten migrated.');

  // ── Step 4: Update user docs with unreadPerGroep ──────────────────────────
  const usersSnap = await db.collection('users').get();
  console.log(`Updating ${usersSnap.docs.length} user docs...`);

  batch = db.batch();
  batchCount = 0;

  for (const userDoc of usersSnap.docs) {
    const data = userDoc.data() as { unreadCount?: number };
    const unreadCount = data.unreadCount ?? 0;

    batch.update(userDoc.ref, {
      unreadPerGroep: { [algemeenId]: unreadCount },
    });
    batchCount++;

    if (batchCount >= BATCH_SIZE) {
      await batch.commit();
      console.log(`  Committed user batch of ${batchCount}`);
      batch = db.batch();
      batchCount = 0;
    }
  }
  if (batchCount > 0) {
    await batch.commit();
    console.log(`  Committed final user batch of ${batchCount}`);
  }
  console.log('User docs updated.');

  console.log('\nMigration complete!');
  console.log(`Algemeen groep ID: ${algemeenId}`);
}

main().catch(e => {
  console.error('Migration failed:', e);
  process.exit(1);
});
