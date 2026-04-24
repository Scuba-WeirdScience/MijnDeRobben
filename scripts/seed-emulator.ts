/**
 * seed-emulator.ts
 *
 * Seeds the Firebase Auth + Firestore emulators with default dev users.
 * Uses the Firebase Admin SDK pointed at the local emulators.
 * Run AFTER the emulators are up:
 *
 *   npx ts-node --esm scripts/seed-emulator.ts
 *
 * The script is idempotent — existing users get their claims + docs updated.
 */

// Point Admin SDK at the emulators before importing firebase-admin
process.env['FIREBASE_AUTH_EMULATOR_HOST'] = 'localhost:9099';
process.env['FIRESTORE_EMULATOR_HOST']     = 'localhost:8080';

import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

initializeApp({ projectId: 'demo-derobben' });

const db   = getFirestore();
const auth = getAuth();

interface SeedUser {
  email:       string;
  password:    string;
  firstName:   string;
  lastName:    string;
  dateOfBirth: string;
  isValidated: boolean;
  roles:       Record<string, boolean>;
}

const SEED_USERS: SeedUser[] = [
  {
    email:       'admin@example.com',
    password:    'Admin@12345',
    firstName:   'Jan',
    lastName:    'De Vos',
    dateOfBirth: '1985-03-15',
    isValidated: true,
    roles:       { Beheer: true, Lid: true, Bestuur: true, MateriaalCommissie: true, InstructieKader: true },
  },
];

async function seed(): Promise<void> {
  const now = new Date().toISOString();

  for (const user of SEED_USERS) {
    console.log(`Seeding ${user.email}...`);

    // Create or retrieve the Auth user
    let uid: string;
    try {
      const existing = await auth.getUserByEmail(user.email);
      uid = existing.uid;
      console.log(`  -> user exists (uid: ${uid}), updating claims + docs.`);
    } catch {
      const created = await auth.createUser({ email: user.email, password: user.password, emailVerified: user.isValidated });
      uid = created.uid;
      console.log(`  -> created (uid: ${uid})`);
    }

    // Always set custom claims
    await auth.setCustomUserClaims(uid, user.roles);
    console.log(`  -> claims set: ${JSON.stringify(user.roles)}`);

    const joinDate = now.split('T')[0];

    // Upsert Firestore docs
    await db.collection('users').doc(uid).set({
      uid,
      email:       user.email,
      firstName:   user.firstName,
      lastName:    user.lastName,
      dateOfBirth: null,
      joinDate,
      isActive:    true,
      isValidated: user.isValidated,
      avatarUrl:   null,
      unreadCount: 0,
      settings:    null,
      createdAt:   now,
      updatedAt:   null,
    }, { merge: true });

    await db.collection('members').doc(uid).set({
      id:          uid,
      userId:      uid,
      email:       user.email,
      firstName:   user.firstName,
      lastName:    user.lastName,
      dateOfBirth: user.dateOfBirth,
      joinDate,
      isActive:    true,
      isValidated: user.isValidated,
      avatarUrl:   null,
      verzorgerIds: [],
      createdAt:   now,
      updatedAt:   null,
    }, { merge: true });

    console.log(`  -> Firestore docs upserted.`);
  }

  console.log('Done.');
  process.exit(0);
}

seed().catch(e => { console.error(e); process.exit(1); });
