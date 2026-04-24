import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { db, REGION } from '../shared/admin';
import { LeningDoc, MateriaalDoc, MateriaalTypeDoc, MemberDoc } from '../shared/types';

// ── takeLening ─────────────────────────────────────────────────────────────
export const takeLening = onCall({ region: REGION }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Not signed in.');

  const { materiaalId } = request.data as { materiaalId: string };
  const uid = request.auth.uid;

  return await db.runTransaction(async (tx) => {
    const materiaalSnap = await tx.get(db.collectionGroup('materialen').where('id', '==', materiaalId).limit(1) as never);
    if (materiaalSnap.empty) throw new HttpsError('not-found', 'Materiaal niet gevonden.');

    const materiaalRef = materiaalSnap.docs[0].ref;
    const materiaal = materiaalSnap.docs[0].data() as MateriaalDoc;

    if (materiaal.actief) {
      throw new HttpsError('failed-precondition', 'Dit materiaal is al uitgeleend.');
    }

    const typeRef = db.collection('materiaal-types').doc(materiaal.materiaalTypeId);
    const typeSnap = await tx.get(typeRef);
    const type = typeSnap.data() as MateriaalTypeDoc;

    if (type.maxLeningenPerLid !== null) {
      const openQuery = db.collection('leningen')
        .where('memberUserId', '==', uid)
        .where('materiaalTypeId', '==', materiaal.materiaalTypeId)
        .where('retourdatum', '==', null);
      const openSnap = await tx.get(openQuery);
      if (openSnap.size >= type.maxLeningenPerLid) {
        throw new HttpsError('failed-precondition', `Maximaal ${type.maxLeningenPerLid} items van dit type per lid.`);
      }
    }

    const memberSnap = await tx.get(db.collection('members').doc(uid));
    if (!memberSnap.exists) throw new HttpsError('not-found', 'Lid niet gevonden.');
    const member = memberSnap.data() as MemberDoc;

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

    tx.set(leningRef, lening);
    tx.update(materiaalRef, { actief: true });
    return lening;
  });
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

    const today = new Date().toISOString().split('T')[0];
    tx.update(leningRef, { retourdatum: today, notities: notities ?? null });

    const materiaalSnap = await tx.get(
      db.collectionGroup('materialen').where('id', '==', lening.materiaalId).limit(1) as never
    );
    if (!materiaalSnap.empty) {
      tx.update(materiaalSnap.docs[0].ref, { actief: false });
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
