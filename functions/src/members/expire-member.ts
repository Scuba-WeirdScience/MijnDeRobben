import * as admin from 'firebase-admin';
import { db, auth } from '../shared/admin';

/**
 * Expires a membership:
 * 1. Sets isActive = false on members/ and users/ docs
 * 2. Revokes all custom claims
 * 3. Disables the Firebase Auth account (invalidates all sessions)
 * 4. Removes the user from every groep
 */
export async function expireMember(uid: string): Promise<void> {
  const now = new Date().toISOString();

  const batch = db.batch();
  batch.update(db.collection('members').doc(uid), { isActive: false, updatedAt: now });
  batch.update(db.collection('users').doc(uid),   { isActive: false, updatedAt: now });
  await batch.commit();

  await auth.setCustomUserClaims(uid, {});
  await auth.updateUser(uid, { disabled: true });

  const groepSnap = await db.collection('groepen')
    .where('memberUids', 'array-contains', uid)
    .get();

  if (!groepSnap.empty) {
    const groepBatch = db.batch();
    for (const doc of groepSnap.docs) {
      groepBatch.update(doc.ref, {
        memberUids: admin.firestore.FieldValue.arrayRemove(uid),
      });
    }
    await groepBatch.commit();
  }
}
