/**
 * One-time migration: SQL Server (ScubaGatewayDb) → Firebase Firestore + Auth
 *
 * Prerequisites:
 *   1. Firebase Admin SDK service account key at scripts/serviceAccountKey.json
 *   2. SQL Server accessible via the connection string below
 *   3. npm install (in project root or scripts/)  →  needs:
 *        npm install -D ts-node typescript
 *        npm install firebase-admin mssql
 *
 * Run:
 *   npx ts-node --esm scripts/migrate.ts
 *
 * What it migrates (in order):
 *   1. Users  →  Firebase Auth + Firestore /users/{uid}
 *   2. Members  →  Firestore /members/{uid}  (doc ID = Firebase Auth UID)
 *   3. BrevetTypes (from Brevetten distinct values)  →  /brevetTypes/{id}
 *   4. SpecialtyTypes  →  /specialtyTypes/{id}
 *   5. Brevetten  →  /brevetten/{id}
 *   6. MemberOrganisaties  →  /memberOrganisaties/{id}
 *   7. MateriaalTypes  →  /materiaalTypes/{id}
 *   8. Materialen  →  /materialen/{id}
 *   9. Leningen  →  /leningen/{id}
 *  10. Berichten  →  /berichten/{id}
 *  11. BerichtenLezingen  →  /berichten/{id}/lezingen/{memberId}
 *  12. User unreadCount  →  /users/{uid}.unreadCount
 */

import * as admin from 'firebase-admin';
import * as sql from 'mssql';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Config ────────────────────────────────────────────────────────────────────

const SERVICE_ACCOUNT_PATH = resolve(__dirname, 'serviceAccountKey.json');

const SQL_CONFIG: sql.config = {
  server: 'localhost',
  database: 'ScubaGatewayDb',
  options: {
    trustServerCertificate: true,
    encrypt: false,
  },
  authentication: {
    type: 'default',
    options: {
      userName: 'sa',
      password: process.env['SA_PASSWORD'] ?? (() => { throw new Error('SA_PASSWORD env var is required'); })(),
    },
  },
};

// ── Firebase init ─────────────────────────────────────────────────────────────

const serviceAccount = JSON.parse(readFileSync(SERVICE_ACCOUNT_PATH, 'utf-8'));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

const auth = admin.auth();
const db = admin.firestore();
db.settings({ ignoreUndefinedProperties: true });

// ── Helpers ───────────────────────────────────────────────────────────────────

function isoDate(d: Date | null | undefined): string | null {
  if (!d) return null;
  return d.toISOString().substring(0, 10);
}

function isoDateTime(d: Date | null | undefined): string | null {
  if (!d) return null;
  return d.toISOString();
}

/** Firestore batch writer that auto-flushes at 400 ops (limit is 500). */
class BatchWriter {
  private batch = db.batch();
  private count = 0;
  private flushed = 0;

  set(ref: FirebaseFirestore.DocumentReference, data: object) {
    this.batch.set(ref, data);
    this.count++;
    if (this.count >= 400) {
      this.flush();
    }
  }

  async flush() {
    if (this.count === 0) return;
    await this.batch.commit();
    this.flushed += this.count;
    console.log(`  ✓ Flushed batch (${this.count} ops, ${this.flushed} total)`);
    this.batch = db.batch();
    this.count = 0;
  }
}

function log(msg: string) {
  console.log(`\n▶ ${msg}`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const pool = await sql.connect(SQL_CONFIG);
  console.log('✓ Connected to SQL Server');

  // uid lookup: SQL Users.Id (nvarchar) → Firebase Auth UID
  const uidMap = new Map<string, string>(); // sqlUserId → firebaseUid
  // memberId lookup: SQL Members.Id (guid) → Firebase Auth UID
  const memberUidMap = new Map<string, string>(); // sqlMemberId → firebaseUid

  // ── 1. Users ─────────────────────────────────────────────────────────────────
  log('Migrating Users → Firebase Auth + /users');
  const usersResult = await pool.request().query<{
    Id: string;
    Email: string;
    FirstName: string | null;
    LastName: string | null;
    DateOfBirth: Date | null;
    JoinDate: Date;
    IsActive: boolean;
    IsValidated: boolean;
    AvatarUrl: string | null;
    CreatedAt: Date;
    UpdatedAt: Date | null;
    Roles: string | null; // comma-separated role names via join
  }>(`
    SELECT
      u.Id,
      u.Email,
      u.FirstName,
      u.LastName,
      u.DateOfBirth,
      u.JoinDate,
      u.IsActive,
      u.IsValidated,
      u.AvatarUrl,
      u.CreatedAt,
      u.UpdatedAt,
      STRING_AGG(r.Name, ',') AS Roles
    FROM Users u
    LEFT JOIN UserRoles ur ON ur.UserId = u.Id
    LEFT JOIN Roles r ON r.Id = ur.RoleId
    GROUP BY u.Id, u.Email, u.FirstName, u.LastName, u.DateOfBirth,
             u.JoinDate, u.IsActive, u.IsValidated, u.AvatarUrl, u.CreatedAt, u.UpdatedAt
  `);

  let userBatch = new BatchWriter();
  for (const row of usersResult.recordset) {
    const roles: string[] = row.Roles ? row.Roles.split(',').filter(Boolean) : [];

    // Create or get Firebase Auth user
    let uid: string;
    try {
      const existing = await auth.getUserByEmail(row.Email);
      uid = existing.uid;
      console.log(`  ~ Auth user already exists: ${row.Email} (${uid})`);
    } catch {
      const created = await auth.createUser({
        email: row.Email,
        displayName: [row.FirstName, row.LastName].filter(Boolean).join(' ') || row.Email,
        disabled: !row.IsActive,
      });
      uid = created.uid;
      console.log(`  + Created Auth user: ${row.Email} (${uid})`);
    }

    // Set custom claims (roles)
    if (roles.length > 0) {
      await auth.setCustomUserClaims(uid, { roles });
    }

    uidMap.set(row.Id, uid);

    // Write /users/{uid}
    const userRef = db.collection('users').doc(uid);
    userBatch.set(userRef, {
      uid,
      email: row.Email,
      firstName: row.FirstName ?? '',
      lastName: row.LastName ?? '',
      dateOfBirth: isoDate(row.DateOfBirth),
      joinDate: isoDate(row.JoinDate) ?? new Date().toISOString().substring(0, 10),
      isActive: row.IsActive,
      isValidated: row.IsValidated,
      avatarUrl: row.AvatarUrl ?? null,
      unreadCount: 0, // recalculated after berichten migration
      createdAt: isoDateTime(row.CreatedAt) ?? new Date().toISOString(),
      updatedAt: isoDateTime(row.UpdatedAt),
    });
  }
  await userBatch.flush();
  console.log(`  ✓ ${usersResult.recordset.length} users migrated`);

  // ── 2. Members ────────────────────────────────────────────────────────────────
  log('Migrating Members → /members');
  const membersResult = await pool.request().query<{
    Id: string;
    UserId: string;
    FirstName: string;
    LastName: string;
    DateOfBirth: Date;
    JoinDate: Date;
    IsActive: boolean;
    IsValidated: boolean;
    AvatarUrl: string | null;
    CreatedAt: Date;
    UpdatedAt: Date | null;
  }>(`SELECT * FROM Members`);

  let memberBatch = new BatchWriter();
  for (const row of membersResult.recordset) {
    const uid = uidMap.get(row.UserId);
    if (!uid) {
      console.warn(`  ⚠ No Firebase UID for UserId ${row.UserId} — skipping member ${row.Id}`);
      continue;
    }
    memberUidMap.set(row.Id, uid);

    // Use Firebase UID as doc ID
    const ref = db.collection('members').doc(uid);
    memberBatch.set(ref, {
      id: uid,
      userId: uid,
      firstName: row.FirstName,
      lastName: row.LastName,
      dateOfBirth: isoDate(row.DateOfBirth),
      joinDate: isoDate(row.JoinDate),
      isActive: row.IsActive,
      isValidated: row.IsValidated,
      avatarUrl: row.AvatarUrl ?? null,
      createdAt: isoDateTime(row.CreatedAt),
      updatedAt: isoDateTime(row.UpdatedAt),
    });
  }
  await memberBatch.flush();
  console.log(`  ✓ ${membersResult.recordset.length} members migrated`);

  // ── 3. SpecialtyTypes ─────────────────────────────────────────────────────────
  log('Migrating SpecialtyTypes → /specialtyTypes');
  const stResult = await pool.request().query<{
    Id: string; Organisatie: string; Naam: string; Volgorde: number;
  }>(`SELECT * FROM SpecialtyTypes`);

  let stBatch = new BatchWriter();
  for (const row of stResult.recordset) {
    stBatch.set(db.collection('specialtyTypes').doc(row.Id), {
      id: row.Id,
      organisatie: row.Organisatie,
      naam: row.Naam,
      volgorde: row.Volgorde,
    });
  }
  await stBatch.flush();
  console.log(`  ✓ ${stResult.recordset.length} specialtyTypes migrated`);

  // ── 4. Brevetten ──────────────────────────────────────────────────────────────
  log('Migrating Brevetten → /brevetten');
  const brevResult = await pool.request().query<{
    Id: string; MemberId: string; Organisatie: string; OrganisatieNaam: string | null;
    Niveau: string; BrevetType: string; BehaaldDatum: Date | null;
    Notities: string | null; CreatedAt: Date; UpdatedAt: Date | null;
  }>(`SELECT * FROM Brevetten`);

  let brevBatch = new BatchWriter();
  for (const row of brevResult.recordset) {
    const memberId = memberUidMap.get(row.MemberId);
    if (!memberId) {
      console.warn(`  ⚠ No UID for MemberId ${row.MemberId} — skipping brevet ${row.Id}`);
      continue;
    }
    brevBatch.set(db.collection('brevetten').doc(row.Id), {
      id: row.Id,
      memberId,
      organisatie: row.Organisatie,
      organisatieNaam: row.OrganisatieNaam ?? null,
      niveau: row.Niveau,
      brevetType: row.BrevetType,
      behaaldDatum: isoDate(row.BehaaldDatum),
      notities: row.Notities ?? null,
      createdAt: isoDateTime(row.CreatedAt),
      updatedAt: isoDateTime(row.UpdatedAt),
    });
  }
  await brevBatch.flush();
  console.log(`  ✓ ${brevResult.recordset.length} brevetten migrated`);

  // ── 5. MemberOrganisaties ─────────────────────────────────────────────────────
  log('Migrating MemberOrganisaties → /memberOrganisaties');
  const moResult = await pool.request().query<{
    Id: string; MemberId: string; Organisatie: string;
    Logboeknummer: string | null; BeginDatum: Date | null;
    CreatedAt: Date; UpdatedAt: Date | null;
  }>(`SELECT * FROM MemberOrganisaties`);

  let moBatch = new BatchWriter();
  for (const row of moResult.recordset) {
    const memberId = memberUidMap.get(row.MemberId);
    if (!memberId) {
      console.warn(`  ⚠ No UID for MemberId ${row.MemberId} — skipping memberOrganisatie ${row.Id}`);
      continue;
    }
    moBatch.set(db.collection('memberOrganisaties').doc(row.Id), {
      id: row.Id,
      memberId,
      organisatie: row.Organisatie,
      logboeknummer: row.Logboeknummer ?? null,
      beginDatum: isoDate(row.BeginDatum),
      createdAt: isoDateTime(row.CreatedAt),
      updatedAt: isoDateTime(row.UpdatedAt),
    });
  }
  await moBatch.flush();
  console.log(`  ✓ ${moResult.recordset.length} memberOrganisaties migrated`);

  // ── 6. MateriaalTypes ─────────────────────────────────────────────────────────
  log('Migrating MateriaalTypes → /materiaalTypes');
  const mtResult = await pool.request().query<{
    Id: string; Naam: string; Beschrijving: string | null;
    Volgorde: number; CreatedAt: Date; UpdatedAt: Date | null;
  }>(`SELECT * FROM MateriaalTypes`);

  let mtBatch = new BatchWriter();
  for (const row of mtResult.recordset) {
    mtBatch.set(db.collection('materiaalTypes').doc(row.Id), {
      id: row.Id,
      naam: row.Naam,
      beschrijving: row.Beschrijving ?? null,
      volgorde: row.Volgorde,
      maxLeningenPerLid: null,
      huurprijs: null,
      customProperties: null,
      createdAt: isoDateTime(row.CreatedAt),
      updatedAt: isoDateTime(row.UpdatedAt),
    });
  }
  await mtBatch.flush();
  console.log(`  ✓ ${mtResult.recordset.length} materiaalTypes migrated`);

  // ── 7. Materialen ─────────────────────────────────────────────────────────────
  log('Migrating Materialen → /materialen');
  const matResult = await pool.request().query<{
    Id: string; MateriaalTypeId: string; Naam: string;
    Serienummer: string | null; Notities: string | null;
    AankoopDatum: Date | null; CreatedAt: Date; UpdatedAt: Date | null;
  }>(`SELECT * FROM Materialen`);

  let matBatch = new BatchWriter();
  for (const row of matResult.recordset) {
    matBatch.set(db.collection('materialen').doc(row.Id), {
      id: row.Id,
      materiaalTypeId: row.MateriaalTypeId,
      naam: row.Naam,
      serienummer: row.Serienummer ?? null,
      notities: row.Notities ?? null,
      aankoopDatum: isoDate(row.AankoopDatum),
      actief: true,
      customProperties: null,
      createdAt: isoDateTime(row.CreatedAt),
      updatedAt: isoDateTime(row.UpdatedAt),
    });
  }
  await matBatch.flush();
  console.log(`  ✓ ${matResult.recordset.length} materialen migrated`);

  // ── 8. Leningen ───────────────────────────────────────────────────────────────
  log('Migrating MateriaalLeningen → /leningen');
  const leenResult = await pool.request().query<{
    Id: string; MateriaalId: string; MemberId: string;
    UitgeleendDatum: Date; Retourdatum: Date | null;
    Notities: string | null; CreatedAt: Date;
    // joined fields
    MateriaalNaam: string; MateriaalTypeId: string; MateriaalTypeNaam: string;
    MemberUserId: string; MemberNaam: string;
  }>(`
    SELECT
      l.Id, l.MateriaalId, l.MemberId,
      l.UitgeleendDatum, l.Retourdatum, l.Notities, l.CreatedAt,
      m.Naam AS MateriaalNaam,
      m.MateriaalTypeId,
      mt.Naam AS MateriaalTypeNaam,
      mem.UserId AS MemberUserId,
      TRIM(mem.FirstName + ' ' + mem.LastName) AS MemberNaam
    FROM MateriaalLeningen l
    JOIN Materialen m ON m.Id = l.MateriaalId
    JOIN MateriaalTypes mt ON mt.Id = m.MateriaalTypeId
    JOIN Members mem ON mem.Id = l.MemberId
  `);

  let leenBatch = new BatchWriter();
  for (const row of leenResult.recordset) {
    const memberId = memberUidMap.get(row.MemberId);
    const memberUserId = uidMap.get(row.MemberUserId) ?? memberId ?? row.MemberUserId;
    if (!memberId) {
      console.warn(`  ⚠ No UID for MemberId ${row.MemberId} — skipping lening ${row.Id}`);
      continue;
    }
    leenBatch.set(db.collection('leningen').doc(row.Id), {
      id: row.Id,
      materiaalId: row.MateriaalId,
      materiaalTypeId: row.MateriaalTypeId,
      materiaalNaam: row.MateriaalNaam,
      materiaalTypeNaam: row.MateriaalTypeNaam,
      memberId,
      memberUserId,
      memberNaam: row.MemberNaam,
      uitgeleendDatum: isoDate(row.UitgeleendDatum),
      retourdatum: isoDate(row.Retourdatum),
      notities: row.Notities ?? null,
      createdAt: isoDateTime(row.CreatedAt),
    });
  }
  await leenBatch.flush();
  console.log(`  ✓ ${leenResult.recordset.length} leningen migrated`);

  // ── 9. Berichten ──────────────────────────────────────────────────────────────
  log('Migrating Berichten → /berichten');
  const berResult = await pool.request().query<{
    Id: string; Onderwerp: string; Inhoud: string; IsPinned: boolean;
    ZenderId: string; AangemaaktOp: Date; BijgewerktOp: Date | null;
    ZenderNaam: string; ZenderAvatarUrl: string | null;
  }>(`
    SELECT
      b.Id, b.Onderwerp, b.Inhoud, b.IsPinned, b.ZenderId,
      b.AangemaaktOp, b.BijgewerktOp,
      TRIM(m.FirstName + ' ' + m.LastName) AS ZenderNaam,
      m.AvatarUrl AS ZenderAvatarUrl
    FROM Berichten b
    JOIN Members m ON m.Id = b.ZenderId
  `);

  // Map SQL Members.Id → Firestore member UID for ZenderId
  let berBatch = new BatchWriter();
  for (const row of berResult.recordset) {
    const zenderId = memberUidMap.get(row.ZenderId) ?? row.ZenderId;
    berBatch.set(db.collection('berichten').doc(row.Id), {
      id: row.Id,
      onderwerp: row.Onderwerp,
      inhoud: row.Inhoud,
      isPinned: row.IsPinned,
      zenderId,
      zenderNaam: row.ZenderNaam,
      zenderAvatarUrl: row.ZenderAvatarUrl ?? null,
      aangemaaktOp: isoDateTime(row.AangemaaktOp),
      bijgewerktOp: isoDateTime(row.BijgewerktOp),
    });
  }
  await berBatch.flush();
  console.log(`  ✓ ${berResult.recordset.length} berichten migrated`);

  // ── 10. BerichtenLezingen → subcollection + unreadCount ───────────────────────
  log('Migrating BerichtenLezingen → /berichten/{id}/lezingen + user unreadCounts');

  const lezResult = await pool.request().query<{
    BerichtId: string; LezerId: string; GelezenOp: Date;
  }>(`SELECT BerichtId, LezerId, GelezenOp FROM BerichtenLezingen`);

  // Build a set of (memberId → Set<berichtId>) read receipts
  const readMap = new Map<string, Set<string>>(); // memberId (uid) → berichtIds
  let lezBatch = new BatchWriter();

  for (const row of lezResult.recordset) {
    const memberId = memberUidMap.get(row.LezerId);
    if (!memberId) continue;

    const ref = db.collection('berichten').doc(row.BerichtId)
      .collection('lezingen').doc(memberId);
    lezBatch.set(ref, {
      memberId,
      gelezenOp: isoDateTime(row.GelezenOp),
    });

    if (!readMap.has(memberId)) readMap.set(memberId, new Set());
    readMap.get(memberId)!.add(row.BerichtId);
  }
  await lezBatch.flush();
  console.log(`  ✓ ${lezResult.recordset.length} lezingen migrated`);

  // ── 11. Recalculate unreadCount per user ──────────────────────────────────────
  log('Recalculating unreadCount per user');
  const totalBerichten = berResult.recordset.length;

  let ucBatch = new BatchWriter();
  for (const [uid] of uidMap) {
    const firebaseUid = uidMap.get(uid)!; // uid here is the SQL UserId key
    // Actually uidMap maps sqlUserId → firebaseUid, so:
    const memberUid = firebaseUid;
    const readCount = readMap.get(memberUid)?.size ?? 0;
    const unreadCount = Math.max(0, totalBerichten - readCount);

    const userRef = db.collection('users').doc(memberUid);
    ucBatch.set(userRef, { unreadCount } as object);
  }
  await ucBatch.flush();
  console.log(`  ✓ unreadCounts updated for ${uidMap.size} users`);

  // ── Done ───────────────────────────────────────────────────────────────────────
  await pool.close();
  console.log('\n✅ Migration complete!');
}

main().catch(err => {
  console.error('\n❌ Migration failed:', err);
  process.exit(1);
});
