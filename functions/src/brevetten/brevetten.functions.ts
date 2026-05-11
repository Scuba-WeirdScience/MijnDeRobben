import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { db, REGION } from '../shared/admin';
import { BrevetDoc, BrevetTypeDoc, SpecialtyTypeDoc } from '../shared/types';
import { requireAuth, requireAnyRole } from '../shared/auth-guards';

// ── getMyBrevetten ─────────────────────────────────────────────────────────
export const getMyBrevetten = onCall({ region: REGION }, async (request) => {
  const auth = requireAuth(request);
  const snap = await db.collection('brevetten')
    .where('memberId', '==', auth.uid)
    .orderBy('behaaldDatum', 'desc')
    .get();
  return snap.docs.map(d => d.data());
});

// ── getMemberBrevetten ─────────────────────────────────────────────────────
export const getMemberBrevetten = onCall({ region: REGION }, async (request) => {
  requireAnyRole(request, ['InstructieKader', 'Bestuur', 'Beheer']);
  const { memberId } = request.data as { memberId: string };
  const snap = await db.collection('brevetten')
    .where('memberId', '==', memberId)
    .orderBy('behaaldDatum', 'desc')
    .get();
  return snap.docs.map(d => d.data());
});

// ── createBrevet ───────────────────────────────────────────────────────────
export const createBrevet = onCall({ region: REGION }, async (request) => {
  requireAnyRole(request, ['InstructieKader', 'Bestuur', 'Beheer']);
  const { memberId, brevetType, organisatie, organisatieNaam, niveau, behaaldDatum, notities } = request.data as {
    memberId: string;
    brevetType: string;
    organisatie: string;
    organisatieNaam?: string | null;
    niveau: string;
    behaaldDatum?: string | null;
    notities?: string | null;
  };

  const now = new Date().toISOString();
  const ref = db.collection('brevetten').doc();
  const brevet: BrevetDoc = {
    id: ref.id, memberId, brevetType, organisatie,
    organisatieNaam: organisatieNaam ?? null,
    niveau,
    behaaldDatum: behaaldDatum ?? null,
    notities: notities ?? null,
    createdAt: now, updatedAt: null,
  };
  await ref.set(brevet);
  return brevet;
});

// ── updateBrevet ───────────────────────────────────────────────────────────
export const updateBrevet = onCall({ region: REGION }, async (request) => {
  requireAnyRole(request, ['InstructieKader', 'Bestuur', 'Beheer']);
  const { id, memberId, ...fields } = request.data as {
    id: string; memberId: string;
    brevetType?: string; organisatie?: string; organisatieNaam?: string | null;
    niveau?: string; behaaldDatum?: string | null; notities?: string | null;
  };

  const ref = db.collection('brevetten').doc(id);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError('not-found', 'Brevet niet gevonden.');
  if ((snap.data() as BrevetDoc).memberId !== memberId) {
    throw new HttpsError('invalid-argument', 'Brevet hoort niet bij dit lid.');
  }

  await ref.update({ ...fields, updatedAt: new Date().toISOString() });
  return (await ref.get()).data();
});

// ── deleteBrevet ───────────────────────────────────────────────────────────
export const deleteBrevet = onCall({ region: REGION }, async (request) => {
  requireAnyRole(request, ['InstructieKader', 'Bestuur', 'Beheer']);
  const { id } = request.data as { id: string };
  const snap = await db.collection('brevetten').doc(id).get();
  if (!snap.exists) throw new HttpsError('not-found', 'Brevet niet gevonden.');
  await snap.ref.delete();
  return { success: true };
});

// ── getBrevetTypes ─────────────────────────────────────────────────────────
export const getBrevetTypes = onCall({ region: REGION }, async (request) => {
  requireAuth(request);
  const { organisatie } = (request.data as { organisatie?: string }) ?? {};

  let query: FirebaseFirestore.Query = db.collection('brevet-types').orderBy('volgorde');
  if (organisatie) query = query.where('organisatie', '==', organisatie);

  const snap = await query.get();
  return snap.docs.map(d => d.data());
});

// ── createBrevetType ───────────────────────────────────────────────────────
export const createBrevetType = onCall({ region: REGION }, async (request) => {
  requireAnyRole(request, ['InstructieKader', 'Bestuur', 'Beheer']);
  const { organisatie, naam, volgorde } = request.data as { organisatie: string; naam: string; volgorde: number };
  const ref = db.collection('brevet-types').doc();
  const doc: BrevetTypeDoc = { id: ref.id, organisatie, naam, volgorde };
  await ref.set(doc);
  return doc;
});

// ── updateBrevetType ───────────────────────────────────────────────────────
export const updateBrevetType = onCall({ region: REGION }, async (request) => {
  requireAnyRole(request, ['InstructieKader', 'Bestuur', 'Beheer']);
  const { id, ...fields } = request.data as { id: string; organisatie?: string; naam?: string; volgorde?: number };
  const ref = db.collection('brevet-types').doc(id);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError('not-found', 'BrevetType niet gevonden.');
  await ref.update(fields);
  return (await ref.get()).data();
});

// ── deleteBrevetType ───────────────────────────────────────────────────────
export const deleteBrevetType = onCall({ region: REGION }, async (request) => {
  requireAnyRole(request, ['InstructieKader', 'Bestuur', 'Beheer']);
  const { id } = request.data as { id: string };
  const snap = await db.collection('brevet-types').doc(id).get();
  if (!snap.exists) throw new HttpsError('not-found', 'BrevetType niet gevonden.');
  await snap.ref.delete();
  return { success: true };
});

// ── getSpecialtyTypes ──────────────────────────────────────────────────────
export const getSpecialtyTypes = onCall({ region: REGION }, async (request) => {
  requireAuth(request);
  const { organisatie } = (request.data as { organisatie?: string }) ?? {};

  let query: FirebaseFirestore.Query = db.collection('specialty-types').orderBy('volgorde');
  if (organisatie) query = query.where('organisatie', '==', organisatie);

  const snap = await query.get();
  return snap.docs.map(d => d.data());
});

// ── createSpecialtyType ────────────────────────────────────────────────────
export const createSpecialtyType = onCall({ region: REGION }, async (request) => {
  requireAnyRole(request, ['InstructieKader', 'Bestuur', 'Beheer']);
  const { organisatie, naam, volgorde } = request.data as { organisatie: string; naam: string; volgorde: number };
  const ref = db.collection('specialty-types').doc();
  const doc: SpecialtyTypeDoc = { id: ref.id, organisatie, naam, volgorde };
  await ref.set(doc);
  return doc;
});

// ── updateSpecialtyType ────────────────────────────────────────────────────
export const updateSpecialtyType = onCall({ region: REGION }, async (request) => {
  requireAnyRole(request, ['InstructieKader', 'Bestuur', 'Beheer']);
  const { id, ...fields } = request.data as { id: string; organisatie?: string; naam?: string; volgorde?: number };
  const ref = db.collection('specialty-types').doc(id);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError('not-found', 'SpecialtyType niet gevonden.');
  await ref.update(fields);
  return (await ref.get()).data();
});

// ── deleteSpecialtyType ────────────────────────────────────────────────────
export const deleteSpecialtyType = onCall({ region: REGION }, async (request) => {
  requireAnyRole(request, ['InstructieKader', 'Bestuur', 'Beheer']);
  const { id } = request.data as { id: string };
  const snap = await db.collection('specialty-types').doc(id).get();
  if (!snap.exists) throw new HttpsError('not-found', 'SpecialtyType niet gevonden.');
  await snap.ref.delete();
  return { success: true };
});
