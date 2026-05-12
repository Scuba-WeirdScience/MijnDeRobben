/**
 * import-auth-with-hashes.ts — re-import prod users to staging with correct SCRYPT hash config
 */
import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { GoogleAuth } from 'google-auth-library';

process.env['GOOGLE_APPLICATION_CREDENTIALS'] = `${process.env['APPDATA']}/firebase/YOUR_FIREBASE_ADC_FILENAME_application_default_credentials.json`;

const prodCred = JSON.parse(readFileSync('service-account.json', 'utf8'));

const prodApp = admin.initializeApp(
  { credential: admin.credential.cert(prodCred), projectId: 'dcderobben-d3536' },
  'production',
);
const stagingApp = admin.initializeApp(
  { credential: admin.credential.applicationDefault(), projectId: 'dcderobben-staging' },
  'staging',
);
const prodAuth = admin.auth(prodApp);
const stagingAuth = admin.auth(stagingApp);

// ── Fetch hash config from production ────────────────────────────────────────

const googleAuth = new GoogleAuth({
  credentials: prodCred,
  scopes: ['https://www.googleapis.com/auth/cloud-platform'],
});
const googleClient = await googleAuth.getClient();
const { token } = await googleClient.getAccessToken();

const configResp = await fetch(
  'https://identitytoolkit.googleapis.com/admin/v2/projects/dcderobben-d3536/config',
  { headers: { Authorization: `Bearer ${token}` } },
);
const config: any = await configResp.json();
const hashConfig = config.signIn.hashConfig;
console.log(`✔ Hash config: ${hashConfig.algorithm}, rounds=${hashConfig.rounds}, memoryCost=${hashConfig.memoryCost}`);

// ── List all prod users ───────────────────────────────────────────────────────

const users: admin.auth.UserRecord[] = [];
let pageToken: string | undefined;
do {
  const result = await prodAuth.listUsers(1000, pageToken);
  users.push(...result.users);
  pageToken = result.pageToken;
} while (pageToken);
console.log(`✔ Found ${users.length} production users`);

// ── Clear existing staging users ─────────────────────────────────────────────

const existing = await stagingAuth.listUsers(1000);
if (existing.users.length > 0) {
  await stagingAuth.deleteUsers(existing.users.map(u => u.uid));
  console.log(`✔ Deleted ${existing.users.length} stale staging users`);
}

// ── Import with hash config ───────────────────────────────────────────────────

const importRecords: admin.auth.UserImportRecord[] = users.map(u => ({
  uid: u.uid,
  email: u.email,
  emailVerified: u.emailVerified,
  displayName: u.displayName,
  photoURL: u.photoURL,
  disabled: u.disabled,
  customClaims: u.customClaims,
  passwordHash: u.passwordHash ? Buffer.from(u.passwordHash, 'base64') : undefined,
  passwordSalt: u.passwordSalt ? Buffer.from(u.passwordSalt, 'base64') : undefined,
  metadata: {
    creationTime: u.metadata.creationTime,
    lastSignInTime: u.metadata.lastSignInTime,
  },
  providerData: u.providerData,
}));

const result = await stagingAuth.importUsers(importRecords, {
  hash: {
    algorithm: 'SCRYPT',
    key: Buffer.from(hashConfig.signerKey, 'base64'),
    saltSeparator: Buffer.from(hashConfig.saltSeparator, 'base64'),
    rounds: hashConfig.rounds,
    memoryCost: hashConfig.memoryCost,
  },
});

if (result.errors.length > 0) {
  for (const e of result.errors) console.warn(`  ⚠ index ${e.index}: ${e.error.message}`);
}

console.log(`✔ Imported ${users.length - result.errors.length}/${users.length} users with password hashes`);
process.exit(0);
