import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as v1 from 'firebase-functions/v1';
import { auth, db, REGION } from '../shared/admin';
import { UserDoc } from '../shared/types';

const ROLES = ['Beheer', 'Lid', 'Bestuur', 'MateriaalCommissie', 'InstructieKader'] as const;

// ── onUserCreated: bootstrap user + member docs ────────────────────────────
// Uses v1 auth trigger — v2 auth triggers require Identity Platform (paid).
// Uses merge:true so createMember's full write is never overwritten.
export const onUserCreated = v1.region(REGION).auth.user().onCreate(async (user) => {
  const now = new Date().toISOString();

  await auth.setCustomUserClaims(user.uid, { Lid: true });

  const userStub = {
    uid: user.uid,
    email: user.email ?? '',
    isActive: true,
    isValidated: false,
    avatarUrl: null,
    unreadCount: 0,
    settings: null,
    createdAt: now,
    updatedAt: null,
  };

  const memberStub = {
    id: user.uid,
    userId: user.uid,
    email: user.email ?? '',
    isActive: true,
    isValidated: false,
    avatarUrl: null,
    verzorgerIds: [],
    createdAt: now,
    updatedAt: null,
  };

  const batch = db.batch();
  batch.set(db.collection('users').doc(user.uid), userStub, { merge: true });
  batch.set(db.collection('members').doc(user.uid), memberStub, { merge: true });
  await batch.commit();

  // Add new user to the "Algemeen" groep if it exists
  const algemeenSnap = await db.collection('groepen')
    .where('name', '==', 'Algemeen')
    .limit(1)
    .get();
  if (!algemeenSnap.empty) {
    await algemeenSnap.docs[0].ref.update({
      memberUids: admin.firestore.FieldValue.arrayUnion(user.uid),
    });
  }
});

// ── validateGeboortedatum ──────────────────────────────────────────────────
export const validateGeboortedatum = onCall({ region: REGION }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Not signed in.');

  const { geboortedatum } = request.data as { geboortedatum: string };
  if (!geboortedatum) throw new HttpsError('invalid-argument', 'Geboortedatum is verplicht.');

  const userDoc = await db.collection('users').doc(request.auth.uid).get();
  if (!userDoc.exists) throw new HttpsError('not-found', 'Gebruiker niet gevonden.');

  const userData = userDoc.data() as UserDoc;

  if (!userData.isActive) throw new HttpsError('permission-denied', 'AccountInactive');
  if (userData.isValidated) return { success: true };

  if (userData.dateOfBirth && userData.dateOfBirth !== geboortedatum) {
    throw new HttpsError('permission-denied', 'InvalidDateOfBirth');
  }

  await db.collection('users').doc(request.auth.uid).update({ isValidated: true });
  await db.collection('members').doc(request.auth.uid).update({ isValidated: true });

  return { success: true };
});

// ── getRoles ───────────────────────────────────────────────────────────────
export const getRoles = onCall({ region: REGION }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Not signed in.');
  return ROLES;
});
