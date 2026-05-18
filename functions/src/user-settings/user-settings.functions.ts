import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { db, REGION } from '../shared/admin';
import { UserSettings } from '../shared/types';

const ALLOWED_THEMES = ['light', 'dark', 'system'] as const;
const ALLOWED_SCHEMES = ['ocean', 'forest', 'sunset', 'slate', 'rose'] as const;

// ── getUserSettings ────────────────────────────────────────────────────────
export const getUserSettings = onCall({ region: REGION }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Not signed in.');

  const doc = await db.collection('users').doc(request.auth.uid).get();
  if (!doc.exists) throw new HttpsError('not-found', 'Gebruiker niet gevonden.');

  const raw = doc.data()?.['settings'] as string | null | undefined;
  if (!raw) return {} as UserSettings;

  try {
    return JSON.parse(raw) as UserSettings;
  } catch {
    return {} as UserSettings;
  }
});

// ── saveUserSettings ───────────────────────────────────────────────────────
export const saveUserSettings = onCall({ region: REGION }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Not signed in.');

  const incoming = request.data as Partial<UserSettings>;

  if (incoming.theme !== undefined && !ALLOWED_THEMES.includes(incoming.theme)) {
    throw new HttpsError('invalid-argument', 'Ongeldig thema.');
  }
  if (incoming.colorScheme !== undefined && !ALLOWED_SCHEMES.includes(incoming.colorScheme)) {
    throw new HttpsError('invalid-argument', 'Ongeldig kleurenschema.');
  }

  const docRef = db.collection('users').doc(request.auth.uid);
  const snap = await docRef.get();
  if (!snap.exists) throw new HttpsError('not-found', 'Gebruiker niet gevonden.');

  let existing: UserSettings = {};
  const raw = snap.data()?.['settings'] as string | null | undefined;
  if (raw) {
    try { existing = JSON.parse(raw); } catch { /* ignore */ }
  }

  const merged: UserSettings = { ...existing, ...incoming };
  await docRef.update({ settings: JSON.stringify(merged), updatedAt: new Date().toISOString() });

  return merged;
});
