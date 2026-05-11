import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { db, REGION } from '../shared/admin';
import { MemberOrganisatieDoc } from '../shared/types';
import { requireAuth, requireAnyRole } from '../shared/auth-guards';

// ── getMyOrganisaties ───────────────────────────────────────────────────────
export const getMyOrganisaties = onCall({ region: REGION }, async (request) => {
  const auth = requireAuth(request);

  // Resolve the member doc by Firebase Auth UID
  const memberSnap = await db.collection('members')
    .where('userId', '==', auth.uid)
    .limit(1)
    .get();

  if (memberSnap.empty) throw new HttpsError('not-found', 'Lid niet gevonden.');
  const memberId = memberSnap.docs[0].id;

  const snap = await db.collection('member-organisaties')
    .where('memberId', '==', memberId)
    .orderBy('organisatie')
    .get();

  return snap.docs.map(d => d.data());
});

// ── getMemberOrganisaties ───────────────────────────────────────────────────
export const getMemberOrganisaties = onCall({ region: REGION }, async (request) => {
  requireAnyRole(request, ['InstructieKader', 'Bestuur', 'Beheer']);
  const { memberId } = request.data as { memberId: string };

  const snap = await db.collection('member-organisaties')
    .where('memberId', '==', memberId)
    .orderBy('organisatie')
    .get();

  return snap.docs.map(d => d.data());
});

// ── createMemberOrganisatie ─────────────────────────────────────────────────
export const createMemberOrganisatie = onCall({ region: REGION }, async (request) => {
  requireAnyRole(request, ['InstructieKader', 'Bestuur', 'Beheer']);
  const { memberId, organisatie, logboeknummer, beginDatum } = request.data as {
    memberId: string;
    organisatie: string;
    logboeknummer?: string | null;
    beginDatum?: string | null;
  };

  // Prevent duplicate organisatie for the same member
  const existing = await db.collection('member-organisaties')
    .where('memberId', '==', memberId)
    .where('organisatie', '==', organisatie)
    .limit(1)
    .get();

  if (!existing.empty) {
    throw new HttpsError('already-exists', 'Deze organisatie is al gekoppeld voor dit lid.');
  }

  const now = new Date().toISOString();
  const ref = db.collection('member-organisaties').doc();
  const doc: MemberOrganisatieDoc = {
    id: ref.id,
    memberId,
    organisatie,
    logboeknummer: logboeknummer ?? null,
    beginDatum: beginDatum ?? null,
    createdAt: now,
    updatedAt: null,
  };
  await ref.set(doc);
  return doc;
});

// ── updateMemberOrganisatie ─────────────────────────────────────────────────
export const updateMemberOrganisatie = onCall({ region: REGION }, async (request) => {
  requireAnyRole(request, ['InstructieKader', 'Bestuur', 'Beheer']);
  const { id, memberId, logboeknummer, beginDatum } = request.data as {
    id: string;
    memberId: string;
    logboeknummer?: string | null;
    beginDatum?: string | null;
  };

  const ref = db.collection('member-organisaties').doc(id);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError('not-found', 'Organisatiekoppeling niet gevonden.');
  if ((snap.data() as MemberOrganisatieDoc).memberId !== memberId) {
    throw new HttpsError('invalid-argument', 'Organisatiekoppeling hoort niet bij dit lid.');
  }

  await ref.update({
    logboeknummer: logboeknummer ?? null,
    beginDatum: beginDatum ?? null,
    updatedAt: new Date().toISOString(),
  });
  return (await ref.get()).data();
});

// ── deleteMemberOrganisatie ─────────────────────────────────────────────────
export const deleteMemberOrganisatie = onCall({ region: REGION }, async (request) => {
  requireAnyRole(request, ['InstructieKader', 'Bestuur', 'Beheer']);
  const { id } = request.data as { id: string };

  const snap = await db.collection('member-organisaties').doc(id).get();
  if (!snap.exists) throw new HttpsError('not-found', 'Organisatiekoppeling niet gevonden.');
  await snap.ref.delete();
  return { success: true };
});
