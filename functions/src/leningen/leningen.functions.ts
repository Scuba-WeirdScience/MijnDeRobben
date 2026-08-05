import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { db, REGION } from '../shared/admin';
import { LeningDoc, MateriaalDoc, MateriaalTypeDoc, MemberDoc } from '../shared/types';

// ── takeLening ─────────────────────────────────────────────────────────────
export const takeLening = onCall({ region: REGION }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Not signed in.');

  const { materiaalId } = request.data as { materiaalId: string };
  const uid = request.auth.uid;

  // Pre-fetch data that requires queries (not allowed inside transactions)
  const materiaalRef = db.collection('materialen').doc(materiaalId);
  const materiaalSnap = await materiaalRef.get();
  if (!materiaalSnap.exists) throw new HttpsError('not-found', 'Materiaal niet gevonden.');
  const materiaal = materiaalSnap.data() as MateriaalDoc;

  const typeRef = db.collection('materiaal-types').doc(materiaal.materiaalTypeId);
  const typeSnap = await typeRef.get();
  const type = typeSnap.data() as MateriaalTypeDoc;

  if (type.maxLeningenPerLid !== null) {
    const openSnap = await db.collection('leningen')
      .where('memberId', '==', uid)
      .where('materiaalTypeId', '==', materiaal.materiaalTypeId)
      .where('retourdatum', '==', null)
      .get();
    if (openSnap.size >= type.maxLeningenPerLid) {
      throw new HttpsError('failed-precondition', `Maximaal ${type.maxLeningenPerLid} items van dit type per lid.`);
    }
  }

  const memberSnap = await db.collection('members').doc(uid).get();
  if (!memberSnap.exists) throw new HttpsError('not-found', 'Lid niet gevonden.');
  const member = memberSnap.data() as MemberDoc;

  if (materiaal.actief) {
    throw new HttpsError('failed-precondition', 'Dit materiaal is al uitgeleend.');
  }

  const now = new Date().toISOString();
  const today = now.split('T')[0];

  const leningRef = db.collection('leningen').doc();
  const lening: LeningDoc = {
    id: leningRef.id, materiaalId,
    materiaalTypeId: materiaal.materiaalTypeId,
    materiaalNaam: materiaal.naam,
    materiaalTypeNaam: type.naam,
    memberId: uid, memberUserId: uid,
    memberNaam: `${member.firstName} ${member.lastName}`,
    uitgeleendDatum: today, retourdatum: null, notities: null,
    createdAt: now,
  };

  const batch = db.batch();
  batch.set(leningRef, lening);
  batch.update(materiaalRef, { actief: true });
  await batch.commit();

  return lening;
});

// ── returnLening ───────────────────────────────────────────────────────────
export const returnLening = onCall({ region: REGION }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Not signed in.');

  const { leningId, notities } = request.data as { leningId: string; notities?: string };
  const uid = request.auth.uid;

  return await db.runTransaction(async (tx) => {
    const leningRef = db.collection('leningen').doc(leningId);
    const leningSnap = await tx.get(leningRef);
    if (!leningSnap.exists) throw new HttpsError('not-found', 'Lening niet gevonden.');

    const lening = leningSnap.data() as LeningDoc;
    const isAdmin = request.auth?.token?.['Beheer'] || request.auth?.token?.['MateriaalCommissie'];
    if (lening.memberUserId !== uid && !isAdmin) {
      throw new HttpsError('permission-denied', 'Geen toegang.');
    }

    // All reads must happen before any writes in a Firestore transaction.
    const materiaalRef = db.collection('materialen').doc(lening.materiaalId);
    const materiaalSnap = await tx.get(materiaalRef);

    const today = new Date().toISOString().split('T')[0];
    tx.update(leningRef, { retourdatum: today, notities: notities ?? null });
    if (materiaalSnap.exists) {
      tx.update(materiaalRef, { actief: false });
    }

    return { success: true };
  });
});

// ── getMyLeningen ──────────────────────────────────────────────────────────
export const getMyLeningen = onCall({ region: REGION }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Not signed in.');

  const snap = await db.collection('leningen')
    .where('memberUserId', '==', request.auth.uid)
    .where('retourdatum', '==', null)
    .get();

  return snap.docs.map(d => d.data());
});

// ── getMateriaalStatus ─────────────────────────────────────────────────────
export const getMateriaalStatus = onCall({ region: REGION }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Not signed in.');

  const { materiaalId } = request.data as { materiaalId: string };
  const uid = request.auth.uid;

  const snap = await db.collection('leningen')
    .where('materiaalId', '==', materiaalId)
    .where('retourdatum', '==', null)
    .limit(1)
    .get();

  if (snap.empty) return { isLent: false, isMijnLening: false };

  const lening = snap.docs[0].data() as LeningDoc;
  return {
    isLent: true,
    huidigeLeningId: lening.id,
    huidigeLenerNaam: lening.memberNaam,
    uitgeleendDatum: lening.uitgeleendDatum,
    isMijnLening: lening.memberUserId === uid,
    materiaalNaam: lening.materiaalNaam,
    materiaalTypeNaam: lening.materiaalTypeNaam,
  };
});

// ── getAllLeningen (admin) ──────────────────────────────────────────────────
export const getAllLeningen = onCall({ region: REGION }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Not signed in.');
  const isAdmin = request.auth.token?.['Beheer'] || request.auth.token?.['MateriaalCommissie'];
  if (!isAdmin) throw new HttpsError('permission-denied', 'Geen toegang.');

  const snap = await db.collection('leningen').orderBy('createdAt', 'desc').get();
  return snap.docs.map(d => d.data());
});

// ── getLeningenByMateriaalId (admin) ──────────────────────────────────────
export const getLeningenByMateriaalId = onCall({ region: REGION }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Not signed in.');
  const isAdmin = request.auth.token?.['Beheer'] || request.auth.token?.['MateriaalCommissie'];
  if (!isAdmin) throw new HttpsError('permission-denied', 'Geen toegang.');

  const { materiaalId } = request.data as { materiaalId: string };
  if (!materiaalId) throw new HttpsError('invalid-argument', 'materiaalId is verplicht.');

  const snap = await db.collection('leningen')
    .where('materiaalId', '==', materiaalId)
    .orderBy('createdAt', 'desc')
    .get();

  return snap.docs.map(d => d.data());
});

// ── getLeningenByMemberId (admin) ─────────────────────────────────────────
export const getLeningenByMemberId = onCall({ region: REGION }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Not signed in.');
  const isAdmin = request.auth.token?.['Beheer'] || request.auth.token?.['MateriaalCommissie'];
  if (!isAdmin) throw new HttpsError('permission-denied', 'Geen toegang.');

  const { memberId } = request.data as { memberId: string };
  if (!memberId) throw new HttpsError('invalid-argument', 'memberId is verplicht.');

  const snap = await db.collection('leningen')
    .where('memberId', '==', memberId)
    .orderBy('createdAt', 'desc')
    .get();

  return snap.docs.map(d => d.data());
});

// ── getLeningenVoorLid ─────────────────────────────────────────────────────
export const getLeningenVoorLid = onCall({ region: REGION }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Not signed in.');

  const { memberId } = request.data as { memberId: string };
  const uid = request.auth.uid;

  const memberSnap = await db.collection('members').doc(memberId).get();
  if (!memberSnap.exists) throw new HttpsError('not-found', 'Lid niet gevonden.');

  const member = memberSnap.data() as MemberDoc;
  if (!member.verzorgerIds?.includes(uid)) {
    throw new HttpsError('permission-denied', 'Geen toegang tot dit lid.');
  }

  const snap = await db.collection('leningen')
    .where('memberId', '==', memberId)
    .where('retourdatum', '==', null)
    .get();

  return snap.docs.map(d => d.data());
});
