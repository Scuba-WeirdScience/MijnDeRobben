import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const sa = require('../service-account.json');
if (!getApps().length) initializeApp({ credential: cert(sa), projectId: 'dcderobben-d3536' });
const db = getFirestore();

const snap = await db.collection('groepen').get();
console.log(`Found ${snap.size} groepen:`);

const algemeenDocs = snap.docs
  .filter(d => d.data().name === 'Algemeen')
  .sort((a, b) => (a.data().createdAt?.seconds ?? 0) - (b.data().createdAt?.seconds ?? 0));

for (const d of snap.docs) {
  console.log(` - ${d.id}  name="${d.data().name}"  created=${d.data().createdAt?.toDate?.()}`);
}

if (algemeenDocs.length < 2) {
  console.log('No duplicates found, nothing to do.');
  process.exit(0);
}

// Keep the newest, delete the oldest
const toDelete = algemeenDocs[0];
const toKeep   = algemeenDocs[algemeenDocs.length - 1];
console.log(`\nDeleting older Algemeen: ${toDelete.id}`);
console.log(`Keeping newer Algemeen:  ${toKeep.id}`);

await db.collection('groepen').doc(toDelete.id).delete();
console.log('Done.');
