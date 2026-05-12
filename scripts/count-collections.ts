import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const prodCred = JSON.parse(readFileSync('service-account.json', 'utf8'));
const prodApp = admin.initializeApp({ credential: admin.credential.cert(prodCred), projectId: 'dcderobben-d3536' }, 'production');
const db = admin.firestore(prodApp);

const collections = [
  'members','users','groepen','berichten','nieuwBerichten',
  'threads','messages','activiteiten','inschrijvingen',
  'brevetTypes','specialtyTypes','materiaalTypes','materiaal','leningen'
];

for (const col of collections) {
  const snap = await db.collection(col).get();
  console.log(`${col}: ${snap.size}`);
}

// Also check subcollections on groepen
const groepenSnap = await db.collection('groepen').get();
for (const g of groepenSnap.docs) {
  const threads = await db.collection('groepen').doc(g.id).collection('threads').get();
  if (threads.size > 0) console.log(`  groepen/${g.id}/threads: ${threads.size}`);
  for (const t of threads.docs) {
    const msgs = await db.collection('groepen').doc(g.id).collection('threads').doc(t.id).collection('messages').get();
    if (msgs.size > 0) console.log(`    groepen/${g.id}/threads/${t.id}/messages: ${msgs.size}`);
  }
}

process.exit(0);
