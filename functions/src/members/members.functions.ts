import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { db, REGION } from '../shared/admin';
import { MemberDoc } from '../shared/types';
import { sendPasswordResetEmail } from '../shared/mail';
import { expireMember } from './expire-member';
import { requireAuth, requireRole } from '../shared/auth-guards';

// ── getMembers ─────────────────────────────────────────────────────────────
export const getMembers = onCall({ region: REGION }, async (request) => {
  requireAuth(request);

  const { page = 1, pageSize = 20, search = '', isActive } = request.data as {
    page?: number; pageSize?: number; search?: string; isActive?: boolean;
  };

  let query: FirebaseFirestore.Query = db.collection('members');
  if (isActive !== undefined) query = query.where('isActive', '==', isActive);
  query = query.orderBy('lastName').orderBy('firstName');

  const snapshot = await query.get();
  let docs = snapshot.docs.map(d => d.data() as MemberDoc);

  if (search) {
    const s = search.toLowerCase();
    docs = docs.filter(m =>
      m.firstName.toLowerCase().includes(s) || m.lastName.toLowerCase().includes(s)
    );
  }

  const total = docs.length;
  const items = docs.slice((page - 1) * pageSize, page * pageSize);
  return { items, total, page, pageSize };
});

// ── getMember ──────────────────────────────────────────────────────────────
export const getMember = onCall({ region: REGION }, async (request) => {
  requireAuth(request);
  const { memberId } = request.data as { memberId: string };
  const doc = await db.collection('members').doc(memberId).get();
  if (!doc.exists) throw new HttpsError('not-found', 'Member not found.');
  return doc.data();
});

// ── getMe ──────────────────────────────────────────────────────────────────
export const getMe = onCall({ region: REGION }, async (request) => {
  const auth = requireAuth(request);
  const doc = await db.collection('members').doc(auth.uid).get();
  if (!doc.exists) throw new HttpsError('not-found', 'Member not found.');
  return doc.data();
});

// ── createMember ───────────────────────────────────────────────────────────
export const createMember = onCall({ region: REGION }, async (request) => {
  requireRole(request, 'Beheer');

  const { email, firstName, lastName, dateOfBirth, joinDate, isActive } = request.data as {
    email: string; firstName: string; lastName: string;
    dateOfBirth: string; joinDate?: string; isActive?: boolean;
  };

  if (!email) throw new HttpsError('invalid-argument', 'E-mail is verplicht.');

  let uid: string;
  try {
    const userRecord = await admin.auth().createUser({ email });
    uid = userRecord.uid;
  } catch (err: unknown) {
    const firebaseErr = err as { code?: string };
    if (firebaseErr.code === 'auth/email-already-exists') {
      throw new HttpsError('already-exists', 'Dit e-mailadres is al in gebruik.');
    }
    throw new HttpsError('internal', 'Aanmaken account mislukt.');
  }

  await admin.auth().setCustomUserClaims(uid, { Lid: true });

  const now = new Date().toISOString();
  const today = now.split('T')[0];

  const userDoc = {
    uid, email, firstName, lastName, dateOfBirth,
    joinDate: joinDate ?? today,
    isActive: isActive ?? true,
    isValidated: false,
    avatarUrl: null, unreadCount: 0, settings: null,
    createdAt: now, updatedAt: null,
  };

  const member = {
    id: uid, userId: uid, email, firstName, lastName, dateOfBirth,
    joinDate: joinDate ?? today,
    isActive: isActive ?? true,
    isValidated: false,
    avatarUrl: null, verzorgerIds: [],
    createdAt: now, updatedAt: null,
  };

  const batch = db.batch();
  batch.set(db.collection('users').doc(uid), userDoc);
  batch.set(db.collection('members').doc(uid), member);
  await batch.commit();

  try {
    await sendPasswordResetEmail(email);
    console.info(`[createMember] Uitnodiging verzonden naar ${email}`);
  } catch (err) {
    console.warn(`[createMember] Kon geen uitnodiging sturen naar ${email}:`, err);
  }

  return member;
});

// ── resendUitnodiging ──────────────────────────────────────────────────────
export const resendUitnodiging = onCall({ region: REGION }, async (request) => {
  requireRole(request, 'Beheer');

  const { memberId } = request.data as { memberId: string };
  const doc = await db.collection('members').doc(memberId).get();
  if (!doc.exists) throw new HttpsError('not-found', 'Lid niet gevonden.');

  const email = (doc.data() as MemberDoc).email;
  if (!email) throw new HttpsError('failed-precondition', 'Lid heeft geen e-mailadres.');

  const resetLink = await admin.auth().generatePasswordResetLink(email);
  console.info(`[resendUitnodiging] Link gegenereerd voor ${email}: ${resetLink}`);

  try {
    await sendPasswordResetEmail(email);
    console.info(`[resendUitnodiging] Uitnodiging verzonden naar ${email}`);
  } catch (err: any) {
    console.error(`[resendUitnodiging] Fout bij versturen naar ${email}:`, err?.message ?? err);
    throw new HttpsError('internal', 'E-mail versturen mislukt.');
  }

  return { success: true };
});

// ── updateMember ───────────────────────────────────────────────────────────
export const updateMember = onCall({ region: REGION }, async (request) => {
  requireRole(request, 'Beheer');

  const { memberId, ...updates } = request.data as { memberId: string } & Partial<MemberDoc>;
  const doc = await db.collection('members').doc(memberId).get();
  if (!doc.exists) throw new HttpsError('not-found', 'Member not found.');

  const allowed = ['firstName', 'lastName', 'dateOfBirth', 'joinDate', 'isActive', 'verzorgerIds', 'endOfMembership'];
  const safe: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  for (const key of allowed) {
    if ((updates as Record<string, unknown>)[key] !== undefined) {
      safe[key] = (updates as Record<string, unknown>)[key];
    }
  }

  await db.collection('members').doc(memberId).update(safe);

  if ('endOfMembership' in safe) {
    const now = new Date().toISOString();
    await db.collection('users').doc(memberId).update({
      endOfMembership: safe['endOfMembership'] ?? null,
      updatedAt: now,
    });
  }

  return { ...(doc.data() as MemberDoc), ...safe };
});

// ── getMijnKinderen ────────────────────────────────────────────────────────
export const getMijnKinderen = onCall({ region: REGION }, async (request) => {
  const auth = requireAuth(request);

  const snap = await db.collection('members')
    .where('verzorgerIds', 'array-contains', auth.uid)
    .get();

  return snap.docs.map(d => d.data());
});

// ── getVerzorgers ──────────────────────────────────────────────────────────
export const getVerzorgers = onCall({ region: REGION }, async (request) => {
  requireRole(request, 'Beheer');

  const { memberId } = request.data as { memberId: string };
  const doc = await db.collection('members').doc(memberId).get();
  if (!doc.exists) throw new HttpsError('not-found', 'Lid niet gevonden.');

  const member = doc.data() as MemberDoc;
  const ids: string[] = member.verzorgerIds ?? [];
  if (ids.length === 0) return [];

  const userDocs = await Promise.all(
    ids.map(uid => db.collection('users').doc(uid).get())
  );

  return userDocs
    .filter(d => d.exists)
    .map(d => {
      const u = d.data() as { uid: string; email: string; firstName: string; lastName: string };
      return { uid: u.uid, email: u.email, firstName: u.firstName, lastName: u.lastName };
    });
});

// ── addVerzorger ───────────────────────────────────────────────────────────
export const addVerzorger = onCall({ region: REGION }, async (request) => {
  requireRole(request, 'Beheer');

  const { memberId, verzorgerId } = request.data as { memberId: string; verzorgerId: string };
  const memberRef = db.collection('members').doc(memberId);
  const doc = await memberRef.get();
  if (!doc.exists) throw new HttpsError('not-found', 'Lid niet gevonden.');

  const member = doc.data() as MemberDoc;
  if ((member.verzorgerIds ?? []).includes(verzorgerId)) {
    throw new HttpsError('already-exists', 'Deze verzorger is al gekoppeld aan dit lid.');
  }

  await memberRef.update({
    verzorgerIds: admin.firestore.FieldValue.arrayUnion(verzorgerId),
    updatedAt: new Date().toISOString(),
  });

  return { success: true };
});

// ── removeVerzorger ────────────────────────────────────────────────────────
export const removeVerzorger = onCall({ region: REGION }, async (request) => {
  requireRole(request, 'Beheer');

  const { memberId, verzorgerId } = request.data as { memberId: string; verzorgerId: string };
  const memberRef = db.collection('members').doc(memberId);
  const doc = await memberRef.get();
  if (!doc.exists) throw new HttpsError('not-found', 'Lid niet gevonden.');

  await memberRef.update({
    verzorgerIds: admin.firestore.FieldValue.arrayRemove(verzorgerId),
    updatedAt: new Date().toISOString(),
  });

  return { success: true };
});

// ── createVerzorgerUser ────────────────────────────────────────────────────
export const createVerzorgerUser = onCall({ region: REGION }, async (request) => {
  requireRole(request, 'Beheer');

  const { memberId, email, firstName, lastName } = request.data as {
    memberId: string; email: string; firstName: string; lastName: string;
  };

  const memberRef = db.collection('members').doc(memberId);
  const doc = await memberRef.get();
  if (!doc.exists) throw new HttpsError('not-found', 'Lid niet gevonden.');

  let uid: string;
  try {
    const userRecord = await admin.auth().createUser({ email });
    uid = userRecord.uid;
  } catch (err: unknown) {
    const firebaseErr = err as { code?: string };
    if (firebaseErr.code === 'auth/email-already-exists') {
      throw new HttpsError('already-exists', 'Dit e-mailadres is al in gebruik.');
    }
    throw new HttpsError('internal', 'Aanmaken account mislukt.');
  }

  await admin.auth().setCustomUserClaims(uid, { Lid: true });

  const now = new Date().toISOString();
  const today = now.split('T')[0];

  const userDoc = {
    uid, email, firstName, lastName,
    dateOfBirth: null,
    joinDate: today,
    endOfMembership: null,
    isActive: true,
    isValidated: false,
    avatarUrl: null,
    unreadCount: 0,
    unreadPerGroep: {},
    settings: null,
    createdAt: now,
    updatedAt: null,
  };

  const batch = db.batch();
  batch.set(db.collection('users').doc(uid), userDoc);
  batch.update(memberRef, {
    verzorgerIds: admin.firestore.FieldValue.arrayUnion(uid),
    updatedAt: now,
  });
  await batch.commit();

  try {
    await sendPasswordResetEmail(email);
    console.info(`[createVerzorgerUser] Uitnodiging verzonden naar ${email}`);
  } catch (err) {
    console.warn(`[createVerzorgerUser] Kon geen uitnodiging sturen naar ${email}:`, err);
  }

  return { uid, email, firstName, lastName };
});

// ── deleteMember ───────────────────────────────────────────────────────────
export const deleteMember = onCall({ region: REGION }, async (request) => {
  requireRole(request, 'Beheer');

  const { memberId } = request.data as { memberId: string };
  await db.collection('members').doc(memberId).delete();
  return { success: true };
});

// ── scheduledMembershipExpiry ──────────────────────────────────────────────
export const scheduledMembershipExpiry = onSchedule(
  { schedule: 'every day 02:00', region: REGION, timeZone: 'Europe/Brussels' },
  async () => {
    const today = new Date().toISOString().split('T')[0];
    const snap = await db.collection('members').where('isActive', '==', true).get();
    const expired = snap.docs
      .map(d => ({ ...(d.data() as MemberDoc), id: d.id }))
      .filter(m => m.endOfMembership !== null && m.endOfMembership !== undefined && m.endOfMembership <= today);

    console.info(`[scheduledMembershipExpiry] ${expired.length} lid(leden) verlopen op ${today}`);
    for (const member of expired) {
      try {
        await expireMember(member.userId ?? member.id);
        console.info(`[scheduledMembershipExpiry] Vervallen: ${member.userId ?? member.id}`);
      } catch (err) {
        console.error(`[scheduledMembershipExpiry] Fout voor ${member.userId ?? member.id}:`, err);
      }
    }
  }
);
