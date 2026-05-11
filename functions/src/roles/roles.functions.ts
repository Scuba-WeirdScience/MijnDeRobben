import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { auth, db, storage, REGION } from '../shared/admin';
import { UserDoc } from '../shared/types';
import { requireRole, requireAuth } from '../shared/auth-guards';

type Role = 'Beheer' | 'Lid' | 'Bestuur' | 'MateriaalCommissie' | 'InstructieKader';
const VALID_ROLES: Role[] = ['Beheer', 'Lid', 'Bestuur', 'MateriaalCommissie', 'InstructieKader'];

// ── getUsers ───────────────────────────────────────────────────────────────
export const getUsers = onCall({ region: REGION }, async (request) => {
  requireRole(request, 'Beheer');

  const listResult = await auth.listUsers();
  const users = await Promise.all(listResult.users.map(async (u) => {
    const claims = u.customClaims ?? {};
    const roles = VALID_ROLES.filter(r => claims[r] === true);
    const userDoc = await db.collection('users').doc(u.uid).get();
    const data = userDoc.data() as UserDoc | undefined;
    return {
      id: u.uid,
      email: u.email ?? '',
      firstName: data?.firstName ?? '',
      lastName: data?.lastName ?? '',
      isActive: data?.isActive ?? true,
      isValidated: data?.isValidated ?? false,
      roles,
    };
  }));

  return users;
});

// ── getUserRoles ───────────────────────────────────────────────────────────
export const getUserRoles = onCall({ region: REGION }, async (request) => {
  requireRole(request, 'Beheer');

  const { userId } = request.data as { userId: string };
  const user = await auth.getUser(userId);
  const claims = user.customClaims ?? {};
  return VALID_ROLES.filter(r => claims[r] === true);
});

// ── assignRole ─────────────────────────────────────────────────────────────
export const assignRole = onCall({ region: REGION }, async (request) => {
  requireRole(request, 'Beheer');

  const { userId, role } = request.data as { userId: string; role: Role };
  if (!VALID_ROLES.includes(role)) {
    throw new HttpsError('invalid-argument', `Unknown role: ${role}`);
  }

  const user = await auth.getUser(userId);
  const existing = user.customClaims ?? {};
  await auth.setCustomUserClaims(userId, { ...existing, [role]: true });
  return { success: true };
});

// ── removeRole ─────────────────────────────────────────────────────────────
export const removeRole = onCall({ region: REGION }, async (request) => {
  requireRole(request, 'Beheer');

  const { userId, role } = request.data as { userId: string; role: Role };
  const user = await auth.getUser(userId);
  const existing = { ...(user.customClaims ?? {}) };
  delete existing[role];
  await auth.setCustomUserClaims(userId, existing);
  return { success: true };
});

// ── updateUser ─────────────────────────────────────────────────────────────
export const updateUser = onCall({ region: REGION }, async (request) => {
  requireRole(request, 'Beheer');

  const { userId, email, firstName, lastName } = request.data as {
    userId: string; email?: string; firstName?: string; lastName?: string;
  };

  const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  if (firstName !== undefined) updates['firstName'] = firstName;
  if (lastName !== undefined) updates['lastName'] = lastName;

  if (email) {
    await auth.updateUser(userId, { email });
    updates['email'] = email;
  }

  await db.collection('users').doc(userId).update(updates);
  return { success: true };
});

// ── resetPassword ──────────────────────────────────────────────────────────
export const resetPassword = onCall({ region: REGION }, async (request) => {
  requireRole(request, 'Beheer');

  const { userId, newPassword } = request.data as { userId: string; newPassword: string };
  await auth.updateUser(userId, { password: newPassword });
  return { success: true };
});

// ── deleteAvatar ───────────────────────────────────────────────────────────
export const deleteAvatar = onCall({ region: REGION }, async (request) => {
  const authCtx = requireAuth(request);
  const uid = authCtx.uid;
  const bucket = storage.bucket();
  const [files] = await bucket.getFiles({ prefix: `avatars/${uid}` });
  await Promise.all(files.map(f => f.delete()));

  const now = new Date().toISOString();
  await db.collection('users').doc(uid).update({ avatarUrl: null, updatedAt: now });
  await db.collection('members').doc(uid).update({ avatarUrl: null, updatedAt: now });

  return { success: true };
});
