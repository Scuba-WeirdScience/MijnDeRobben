import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onDocumentCreated, onDocumentDeleted } from 'firebase-functions/v2/firestore';
import { db, REGION } from '../shared/admin';
import { BerichtDoc, BerichtLeesDoc, MemberDoc, GroepDoc, NieuwBerichtDoc, ReplyDoc, LezingDoc, ThreadDoc, MessageDoc, ThreadConceptDoc } from '../shared/types';
import { requireAuth } from '../shared/auth-guards';

// ── Legacy functions (kept for backwards compatibility) ────────────────────

// ── getBerichten ───────────────────────────────────────────────────────────
export const getBerichten = onCall({ region: REGION }, async (request) => {
  const auth = requireAuth(request);
  const uid = auth.uid;

  const snap = await db.collection('berichten').orderBy('aangemaaktOp', 'desc').get();

  const results = await Promise.all(snap.docs.map(async (doc) => {
    const bericht = doc.data() as BerichtDoc;
    const leesSnap = await doc.ref.collection('lezingen').get();
    const isGelezen = leesSnap.docs.some(l => l.id === uid);
    return { ...bericht, isGelezen, aantalLezingen: leesSnap.size };
  }));

  return results;
});

// ── getBericht ─────────────────────────────────────────────────────────────
export const getBericht = onCall({ region: REGION }, async (request) => {
  const auth = requireAuth(request);
  const { id } = request.data as { id: string };
  const uid = auth.uid;

  const doc = await db.collection('berichten').doc(id).get();
  if (!doc.exists) throw new HttpsError('not-found', 'Bericht niet gevonden.');

  const bericht = doc.data() as BerichtDoc;
  const leesSnap = await doc.ref.collection('lezingen').get();
  const isGelezen = leesSnap.docs.some(l => l.id === uid);

  return { ...bericht, isGelezen, aantalLezingen: leesSnap.size };
});

// ── createBericht ──────────────────────────────────────────────────────────
export const createBericht = onCall({ region: REGION }, async (request) => {
  const auth = requireAuth(request);

  const { onderwerp, inhoud, isPinned } = request.data as {
    onderwerp: string; inhoud: string; isPinned?: boolean;
  };
  const uid = auth.uid;

  const memberSnap = await db.collection('members').doc(uid).get();
  if (!memberSnap.exists) throw new HttpsError('not-found', 'Lid niet gevonden.');
  const member = memberSnap.data() as MemberDoc;

  const now = new Date().toISOString();
  const berichtRef = db.collection('berichten').doc();
  const bericht: BerichtDoc = {
    id: berichtRef.id,
    onderwerp,
    inhoud,
    isPinned: isPinned ?? false,
    zenderId: uid,
    zenderNaam: `${member.firstName} ${member.lastName}`,
    zenderAvatarUrl: member.avatarUrl ?? null,
    aangemaaktOp: now,
    bijgewerktOp: null,
  };

  await berichtRef.set(bericht);
  return bericht;
});

// ── deleteBericht ──────────────────────────────────────────────────────────
export const deleteBericht = onCall({ region: REGION }, async (request) => {
  const auth = requireAuth(request);

  const { id } = request.data as { id: string };
  const uid = auth.uid;
  const isAdmin = auth.token?.['Beheer'] || auth.token?.['Bestuur'];

  const doc = await db.collection('berichten').doc(id).get();
  if (!doc.exists) throw new HttpsError('not-found', 'Bericht niet gevonden.');

  const bericht = doc.data() as BerichtDoc;
  if (bericht.zenderId !== uid && !isAdmin) {
    throw new HttpsError('permission-denied', 'Geen toegang.');
  }

  const lezingenSnap = await doc.ref.collection('lezingen').get();
  const batch = db.batch();
  lezingenSnap.docs.forEach(l => batch.delete(l.ref));
  batch.delete(doc.ref);
  await batch.commit();

  return { success: true };
});

// ── markeerGelezen ─────────────────────────────────────────────────────────
export const markeerGelezen = onCall({ region: REGION }, async (request) => {
  const auth = requireAuth(request);

  const { id } = request.data as { id: string };
  const uid = auth.uid;

  const berichtRef = db.collection('berichten').doc(id);
  const berichtSnap = await berichtRef.get();
  if (!berichtSnap.exists) throw new HttpsError('not-found', 'Bericht niet gevonden.');

  const leesRef = berichtRef.collection('lezingen').doc(uid);
  const leesSnap = await leesRef.get();
  if (leesSnap.exists) return { success: true };

  const lezing: BerichtLeesDoc = {
    memberId: uid,
    gelezenOp: new Date().toISOString(),
  };
  await leesRef.set(lezing);
  return { success: true };
});

// ── markeerOngelezen ───────────────────────────────────────────────────────
export const markeerOngelezen = onCall({ region: REGION }, async (request) => {
  const auth = requireAuth(request);

  const { id } = request.data as { id: string };
  const uid = auth.uid;

  await db.collection('berichten').doc(id).collection('lezingen').doc(uid).delete();
  return { success: true };
});

// ── onLezingCreated: decrements unreadCount ────────────────────────────────
export const onLezingCreated = onDocumentCreated(
  { document: 'berichten/{berichtId}/lezingen/{memberId}', region: REGION },
  async (event) => {
    const memberId = event.params['memberId'];
    await db.collection('users').doc(memberId).update({
      unreadCount: admin.firestore.FieldValue.increment(-1),
    });
  }
);

// ── onLezingDeleted: increments unreadCount ────────────────────────────────
export const onLezingDeleted = onDocumentDeleted(
  { document: 'berichten/{berichtId}/lezingen/{memberId}', region: REGION },
  async (event) => {
    const memberId = event.params['memberId'];
    await db.collection('users').doc(memberId).update({
      unreadCount: admin.firestore.FieldValue.increment(1),
    });
  }
);

// ── onBerichtCreated: increments unreadCount for all active members ────────
export const onBerichtCreated = onDocumentCreated(
  { document: 'berichten/{berichtId}', region: REGION },
  async (event) => {
    const bericht = event.data?.data() as BerichtDoc | undefined;
    if (!bericht) return;

    const membersSnap = await db.collection('members').where('isActive', '==', true).get();
    const batch = db.batch();
    membersSnap.docs.forEach(memberDoc => {
      if (memberDoc.id === bericht.zenderId) return;
      batch.update(db.collection('users').doc(memberDoc.id), {
        unreadCount: admin.firestore.FieldValue.increment(1),
      });
    });
    await batch.commit();
  }
);

// ── getBerichtenVoorLid ────────────────────────────────────────────────────
export const getBerichtenVoorLid = onCall({ region: REGION }, async (request) => {
  const auth = requireAuth(request);

  const { memberId } = request.data as { memberId: string };
  const uid = auth.uid;

  const memberSnap = await db.collection('members').doc(memberId).get();
  if (!memberSnap.exists) throw new HttpsError('not-found', 'Lid niet gevonden.');

  const member = memberSnap.data() as MemberDoc;
  if (!member.verzorgerIds?.includes(uid)) {
    throw new HttpsError('permission-denied', 'Geen toegang tot dit lid.');
  }

  const snap = await db.collection('berichten').orderBy('aangemaaktOp', 'desc').get();

  const results = await Promise.all(snap.docs.map(async (doc) => {
    const bericht = doc.data() as BerichtDoc;
    const leesSnap = await doc.ref.collection('lezingen').get();
    const isGelezen = leesSnap.docs.some(l => l.id === memberId);
    return { ...bericht, isGelezen, aantalLezingen: leesSnap.size };
  }));

  return results;
});

// ══════════════════════════════════════════════════════════════════════════════
// ── New group messaging functions ─────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

function isAdminUser(request: { auth?: { token?: Record<string, unknown> } }): boolean {
  return !!(request.auth?.token?.['Beheer'] || request.auth?.token?.['Bestuur']);
}

// ── createGroep ────────────────────────────────────────────────────────────
export const createGroep = onCall({ region: REGION }, async (request) => {
  const auth = requireAuth(request);
  if (!isAdminUser(request)) throw new HttpsError('permission-denied', 'Geen toegang.');

  const { name, description, memberUids } = request.data as {
    name: string; description: string; memberUids: string[];
  };

  const ref = db.collection('groepen').doc();
  const groep: GroepDoc = {
    id: ref.id,
    name,
    description,
    memberUids,
    createdBy: auth.uid,
    createdAt: admin.firestore.Timestamp.now(),
  };

  await ref.set(groep);
  return { id: ref.id };
});

// ── updateGroep ────────────────────────────────────────────────────────────
export const updateGroep = onCall({ region: REGION }, async (request) => {
  requireAuth(request);
  if (!isAdminUser(request)) throw new HttpsError('permission-denied', 'Geen toegang.');

  const { groepId, name, description, memberUids } = request.data as {
    groepId: string; name: string; description: string; memberUids: string[];
  };

  const ref = db.collection('groepen').doc(groepId);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError('not-found', 'Groep niet gevonden.');

  await ref.update({ name, description, memberUids });
  return { success: true };
});

// ── deleteGroep ────────────────────────────────────────────────────────────
export const deleteGroep = onCall({ region: REGION }, async (request) => {
  requireAuth(request);
  if (!isAdminUser(request)) throw new HttpsError('permission-denied', 'Geen toegang.');

  const { groepId } = request.data as { groepId: string };

  const ref = db.collection('groepen').doc(groepId);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError('not-found', 'Groep niet gevonden.');

  // Archive all berichten for this group
  const berichtenSnap = await db.collection('nieuwBerichten')
    .where('groepId', '==', groepId)
    .get();

  const batch = db.batch();
  berichtenSnap.docs.forEach(d => {
    batch.update(d.ref, { status: 'gearchiveerd' });
  });
  batch.delete(ref);
  await batch.commit();

  return { success: true };
});

// ── sendBericht ────────────────────────────────────────────────────────────
export const sendBericht = onCall({ region: REGION }, async (request) => {
  const auth = requireAuth(request);

  const { groepId, body } = request.data as { groepId: string; body: string };
  const uid = auth.uid;

  const groepSnap = await db.collection('groepen').doc(groepId).get();
  if (!groepSnap.exists) throw new HttpsError('not-found', 'Groep niet gevonden.');

  const groep = groepSnap.data() as GroepDoc;
  if (!groep.memberUids.includes(uid)) {
    throw new HttpsError('permission-denied', 'Geen lid van deze groep.');
  }

  const memberSnap = await db.collection('members').doc(uid).get();
  const member = memberSnap.exists ? (memberSnap.data() as MemberDoc) : null;
  const authorName = member ? `${member.firstName} ${member.lastName}` : uid;

  const now = admin.firestore.Timestamp.now();
  const berichtRef = db.collection('nieuwBerichten').doc();
  const bericht: NieuwBerichtDoc = {
    id: berichtRef.id,
    groepId,
    authorUid: uid,
    authorName,
    body,
    status: 'gepubliceerd',
    pinnedAt: null,
    createdAt: now,
    updatedAt: now,
  };

  await berichtRef.set(bericht);

  // Bump unreadPerGroep for all other members
  const batch = db.batch();
  groep.memberUids
    .filter(memberUid => memberUid !== uid)
    .forEach(memberUid => {
      batch.update(db.collection('users').doc(memberUid), {
        [`unreadPerGroep.${groepId}`]: admin.firestore.FieldValue.increment(1),
      });
    });
  await batch.commit();

  return { id: berichtRef.id };
});

// ── saveConcept ────────────────────────────────────────────────────────────
export const saveConcept = onCall({ region: REGION }, async (request) => {
  const auth = requireAuth(request);

  const { berichtId, groepId, body } = request.data as {
    berichtId?: string; groepId?: string; body: string;
  };
  const uid = auth.uid;

  const memberSnap = await db.collection('members').doc(uid).get();
  const member = memberSnap.exists ? (memberSnap.data() as MemberDoc) : null;
  const authorName = member ? `${member.firstName} ${member.lastName}` : uid;

  const now = admin.firestore.Timestamp.now();

  if (berichtId) {
    // Update existing concept
    const ref = db.collection('nieuwBerichten').doc(berichtId);
    const snap = await ref.get();
    if (!snap.exists) throw new HttpsError('not-found', 'Concept niet gevonden.');
    const existing = snap.data() as NieuwBerichtDoc;
    if (existing.authorUid !== uid) throw new HttpsError('permission-denied', 'Geen toegang.');
    if (existing.status !== 'concept') throw new HttpsError('failed-precondition', 'Bericht is geen concept.');

    await ref.update({ groepId: groepId ?? null, body, updatedAt: now });
    return { id: berichtId };
  } else {
    // Create new concept
    const ref = db.collection('nieuwBerichten').doc();
    const concept: NieuwBerichtDoc = {
      id: ref.id,
      groepId: groepId ?? null,
      authorUid: uid,
      authorName,
      body,
      status: 'concept',
      pinnedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    await ref.set(concept);
    return { id: ref.id };
  }
});

// ── publishConcept ─────────────────────────────────────────────────────────
export const publishConcept = onCall({ region: REGION }, async (request) => {
  const auth = requireAuth(request);

  const { berichtId, groepId } = request.data as { berichtId: string; groepId: string };
  const uid = auth.uid;

  const ref = db.collection('nieuwBerichten').doc(berichtId);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError('not-found', 'Concept niet gevonden.');

  const concept = snap.data() as NieuwBerichtDoc;
  if (concept.authorUid !== uid) throw new HttpsError('permission-denied', 'Geen toegang.');
  if (concept.status !== 'concept') throw new HttpsError('failed-precondition', 'Bericht is geen concept.');

  // Verify user is member of groep
  const groepSnap = await db.collection('groepen').doc(groepId).get();
  if (!groepSnap.exists) throw new HttpsError('not-found', 'Groep niet gevonden.');
  const groep = groepSnap.data() as GroepDoc;
  if (!groep.memberUids.includes(uid)) {
    throw new HttpsError('permission-denied', 'Geen lid van deze groep.');
  }

  const now = admin.firestore.Timestamp.now();
  await ref.update({ status: 'gepubliceerd', groepId, updatedAt: now });

  // Bump unreadPerGroep for all other members
  const batch = db.batch();
  groep.memberUids
    .filter(memberUid => memberUid !== uid)
    .forEach(memberUid => {
      batch.update(db.collection('users').doc(memberUid), {
        [`unreadPerGroep.${groepId}`]: admin.firestore.FieldValue.increment(1),
      });
    });
  await batch.commit();

  return { success: true };
});

// ── deleteConcept ──────────────────────────────────────────────────────────
export const deleteConcept = onCall({ region: REGION }, async (request) => {
  const auth = requireAuth(request);

  const { berichtId } = request.data as { berichtId: string };
  const uid = auth.uid;

  const ref = db.collection('nieuwBerichten').doc(berichtId);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError('not-found', 'Concept niet gevonden.');

  const concept = snap.data() as NieuwBerichtDoc;
  if (concept.authorUid !== uid) throw new HttpsError('permission-denied', 'Geen toegang.');
  if (concept.status !== 'concept') throw new HttpsError('failed-precondition', 'Bericht is geen concept.');

  await ref.delete();
  return { success: true };
});

// ── addReply ───────────────────────────────────────────────────────────────
export const addReply = onCall({ region: REGION }, async (request) => {
  const auth = requireAuth(request);

  const { berichtId, body } = request.data as { berichtId: string; body: string };
  const uid = auth.uid;

  const berichtSnap = await db.collection('nieuwBerichten').doc(berichtId).get();
  if (!berichtSnap.exists) throw new HttpsError('not-found', 'Bericht niet gevonden.');

  const bericht = berichtSnap.data() as NieuwBerichtDoc;
  if (bericht.status !== 'gepubliceerd' || !bericht.groepId) {
    throw new HttpsError('failed-precondition', 'Bericht is niet gepubliceerd.');
  }

  const groepSnap = await db.collection('groepen').doc(bericht.groepId).get();
  if (!groepSnap.exists) throw new HttpsError('not-found', 'Groep niet gevonden.');
  const groep = groepSnap.data() as GroepDoc;
  if (!groep.memberUids.includes(uid)) {
    throw new HttpsError('permission-denied', 'Geen lid van deze groep.');
  }

  const memberSnap = await db.collection('members').doc(uid).get();
  const member = memberSnap.exists ? (memberSnap.data() as MemberDoc) : null;
  const authorName = member ? `${member.firstName} ${member.lastName}` : uid;

  const now = admin.firestore.Timestamp.now();
  const replyRef = db.collection('nieuwBerichten').doc(berichtId).collection('replies').doc();
  const reply: ReplyDoc = {
    id: replyRef.id,
    authorUid: uid,
    authorName,
    body,
    createdAt: now,
  };

  await replyRef.set(reply);
  return { id: replyRef.id };
});

// ── pinBericht ─────────────────────────────────────────────────────────────
export const pinBericht = onCall({ region: REGION }, async (request) => {
  requireAuth(request);
  if (!isAdminUser(request)) throw new HttpsError('permission-denied', 'Geen toegang.');

  const { berichtId, pin } = request.data as { berichtId: string; pin: boolean };

  const ref = db.collection('nieuwBerichten').doc(berichtId);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError('not-found', 'Bericht niet gevonden.');

  await ref.update({
    pinnedAt: pin ? admin.firestore.Timestamp.now() : null,
  });

  return { success: true };
});

// ── markRead ───────────────────────────────────────────────────────────────
export const markRead = onCall({ region: REGION }, async (request) => {
  const auth = requireAuth(request);

  const { berichtId, groepId } = request.data as { berichtId: string; groepId: string };
  const uid = auth.uid;

  const lezingRef = db.collection('nieuwBerichten').doc(berichtId).collection('lezingen').doc(uid);
  const lezingSnap = await lezingRef.get();

  if (!lezingSnap.exists) {
    const lezing: LezingDoc = {
      readAt: admin.firestore.Timestamp.now(),
    };
    await lezingRef.set(lezing);

    // Decrement unreadPerGroep
    await db.collection('users').doc(uid).update({
      [`unreadPerGroep.${groepId}`]: admin.firestore.FieldValue.increment(-1),
    });
  }

  return { success: true };
});

// ── deleteNieuwBericht ─────────────────────────────────────────────────────
export const deleteNieuwBericht = onCall({ region: REGION }, async (request) => {
  const auth = requireAuth(request);

  const { berichtId } = request.data as { berichtId: string };
  const uid = auth.uid;

  const ref = db.collection('nieuwBerichten').doc(berichtId);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError('not-found', 'Bericht niet gevonden.');

  const data = snap.data() as NieuwBerichtDoc;

  const isAuthor = data.authorUid === uid;
  const isAdmin = !!(auth.token?.['Beheer'] || auth.token?.['Bestuur']);
  if (!isAuthor && !isAdmin) throw new HttpsError('permission-denied', 'Geen toegang.');

  await ref.update({
    deletedAt: admin.firestore.Timestamp.now(),
    body: '',
    updatedAt: admin.firestore.Timestamp.now(),
  });

  return { success: true };
});

// ── markUnread ─────────────────────────────────────────────────────────────
export const markUnread = onCall({ region: REGION }, async (request) => {
  const auth = requireAuth(request);

  const { berichtId, groepId } = request.data as { berichtId: string; groepId: string };
  const uid = auth.uid;

  const lezingRef = db.collection('nieuwBerichten').doc(berichtId).collection('lezingen').doc(uid);
  const lezingSnap = await lezingRef.get();

  if (lezingSnap.exists) {
    await lezingRef.delete();
    await db.collection('users').doc(uid).update({
      [`unreadPerGroep.${groepId}`]: admin.firestore.FieldValue.increment(1),
    });
  }

  return { success: true };
});

// ═══════════════════════════════════════════════════════════════════════════════
// Thread-based messaging v2
// ═══════════════════════════════════════════════════════════════════════════════

// Helper: check if uid is a member of a groep
async function isGroepMember(groepId: string, uid: string): Promise<boolean> {
  const snap = await db.collection('groepen').doc(groepId).get();
  if (!snap.exists) return false;
  const data = snap.data() as GroepDoc;
  return data.memberUids.includes(uid);
}

// Helper: check if uid has a non-Lid role (from custom claims)
function isNonLid(claims: Record<string, unknown>): boolean {
  return !!(claims['Beheer'] || claims['Bestuur'] || claims['MateriaalCommissie'] || claims['InstructieKader']);
}

// Helper: check if uid is admin (Beheer or Bestuur)
function isAdminClaim(claims: Record<string, unknown>): boolean {
  return !!(claims['Beheer'] || claims['Bestuur']);
}

export const createThread = onCall({ region: REGION }, async (request) => {
  const auth = requireAuth(request);
  const { groepId, title, body } = request.data as { groepId: string; title: string; body: string };
  const uid = auth.uid;
  const claims = auth.token as Record<string, unknown>;

  if (!isNonLid(claims)) throw new HttpsError('permission-denied', 'Leden kunnen geen threads aanmaken.');
  if (!(await isGroepMember(groepId, uid))) throw new HttpsError('permission-denied', 'Geen lid van deze groep.');
  if (!title?.trim()) throw new HttpsError('invalid-argument', 'Titel is verplicht.');

  return _createThreadInternal(uid, groepId, title, body);
});

// Internal helper: create a thread (+ optional first message + unread bumps).
// Called by both createThread and publishThreadConcept.
async function _createThreadInternal(
  uid: string,
  groepId: string,
  title: string,
  body: string,
): Promise<{ threadId: string }> {
  // Get author name
  const memberSnap = await db.collection('members').doc(uid).get();
  const authorName = memberSnap.exists ? `${(memberSnap.data() as any).firstName} ${(memberSnap.data() as any).lastName}`.trim() : uid;

  const now = admin.firestore.Timestamp.now();
  const threadRef = db.collection('groepen').doc(groepId).collection('threads').doc();

  const threadDoc: Omit<ThreadDoc, 'id'> = {
    groepId,
    title: title.trim(),
    authorUid: uid,
    authorName,
    pinnedAt: null,
    createdAt: now,
    updatedAt: now,
    lastMessageAt: body?.trim() ? now : null,
    lastMessageBody: body?.trim() ? body.trim().substring(0, 100) : '',
    messageCount: body?.trim() ? 1 : 0,
    unreadPerUser: {},
    threadSeenCount: 0,
    threadSeenByUids: [],
  };

  await threadRef.set(threadDoc);

  // If an initial message body was provided, create the first message
  if (body?.trim()) {
    const msgRef = db.collection('messages').doc();
    const msgDoc: Omit<MessageDoc, 'id'> = {
      threadId: threadRef.id,
      groepId,
      authorUid: uid,
      authorName,
      body: body.trim(),
      status: 'gepubliceerd',
      pinnedAt: null,
      deletedAt: null,
      replyToId: null,
      createdAt: now,
      updatedAt: now,
    };
    await msgRef.set(msgDoc);

    // Bump unread for all other groep members
    const groepSnap = await db.collection('groepen').doc(groepId).get();
    const memberUids: string[] = (groepSnap.data() as GroepDoc).memberUids.filter((m: string) => m !== uid);

    const batch = db.batch();
    for (const memberId of memberUids) {
      batch.update(db.collection('users').doc(memberId), {
        [`unreadPerGroep.${groepId}`]: admin.firestore.FieldValue.increment(1),
      });
    }
    // Also set unreadPerUser on the thread for all other members
    const unreadUpdate: Record<string, FirebaseFirestore.FieldValue> = {};
    for (const memberId of memberUids) {
      unreadUpdate[`unreadPerUser.${memberId}`] = admin.firestore.FieldValue.increment(1);
    }
    batch.update(threadRef, unreadUpdate);
    await batch.commit();
  }

  return { threadId: threadRef.id };
}

export const sendMessage = onCall({ region: REGION }, async (request) => {
  const auth = requireAuth(request);
  const { threadId, groepId, body, replyToId } = request.data as { threadId: string; groepId: string; body: string; replyToId?: string | null };
  const uid = auth.uid;

  if (!(await isGroepMember(groepId, uid))) throw new HttpsError('permission-denied', 'Geen lid van deze groep.');
  if (!body?.trim()) throw new HttpsError('invalid-argument', 'Bericht mag niet leeg zijn.');

  const memberSnap = await db.collection('members').doc(uid).get();
  const authorName = memberSnap.exists ? `${(memberSnap.data() as any).firstName} ${(memberSnap.data() as any).lastName}`.trim() : uid;

  const now = admin.firestore.Timestamp.now();
  const msgRef = db.collection('messages').doc();
  const msgDoc: Omit<MessageDoc, 'id'> = {
    threadId,
    groepId,
    authorUid: uid,
    authorName,
    body: body.trim(),
    status: 'gepubliceerd',
    pinnedAt: null,
    deletedAt: null,
    replyToId: replyToId ?? null,
    createdAt: now,
    updatedAt: now,
  };
  await msgRef.set(msgDoc);

  const threadRef = db.collection('groepen').doc(groepId).collection('threads').doc(threadId);
  const groepSnap = await db.collection('groepen').doc(groepId).get();
  const memberUids: string[] = (groepSnap.data() as GroepDoc).memberUids.filter((m: string) => m !== uid);

  const batch = db.batch();
  // Update thread metadata
  const threadUpdate: Record<string, unknown> = {
    lastMessageAt: now,
    lastMessageBody: body.trim().substring(0, 100),
    updatedAt: now,
    messageCount: admin.firestore.FieldValue.increment(1),
  };
  for (const memberId of memberUids) {
    threadUpdate[`unreadPerUser.${memberId}`] = admin.firestore.FieldValue.increment(1);
  }
  batch.update(threadRef, threadUpdate);

  // Bump unreadPerGroep for all other members
  for (const memberId of memberUids) {
    batch.update(db.collection('users').doc(memberId), {
      [`unreadPerGroep.${groepId}`]: admin.firestore.FieldValue.increment(1),
    });
  }
  await batch.commit();

  return { messageId: msgRef.id };
});

export const saveMessageConcept = onCall({ region: REGION }, async (request) => {
  const auth = requireAuth(request);
  const { messageId, threadId, groepId, body } = request.data as { messageId?: string; threadId: string; groepId: string; body: string };
  const uid = auth.uid;

  if (!(await isGroepMember(groepId, uid))) throw new HttpsError('permission-denied', 'Geen lid van deze groep.');

  const memberSnap = await db.collection('members').doc(uid).get();
  const authorName = memberSnap.exists ? `${(memberSnap.data() as any).firstName} ${(memberSnap.data() as any).lastName}`.trim() : uid;

  const now = admin.firestore.Timestamp.now();

  if (messageId) {
    // Update existing concept
    const ref = db.collection('messages').doc(messageId);
    const snap = await ref.get();
    if (!snap.exists) throw new HttpsError('not-found', 'Concept niet gevonden.');
    if ((snap.data() as MessageDoc).authorUid !== uid) throw new HttpsError('permission-denied', 'Geen toegang.');
    await ref.update({ body: body.trim(), updatedAt: now });
    return { messageId };
  } else {
    // Create new concept
    const ref = db.collection('messages').doc();
    const doc: Omit<MessageDoc, 'id'> = {
      threadId,
      groepId,
      authorUid: uid,
      authorName,
      body: body.trim(),
      status: 'concept',
      pinnedAt: null,
      deletedAt: null,
      replyToId: null,
      createdAt: now,
      updatedAt: now,
    };
    await ref.set(doc);
    return { messageId: ref.id };
  }
});

export const publishMessageConcept = onCall({ region: REGION }, async (request) => {
  const auth = requireAuth(request);
  const { messageId } = request.data as { messageId: string };
  const uid = auth.uid;

  const ref = db.collection('messages').doc(messageId);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError('not-found', 'Concept niet gevonden.');
  const data = snap.data() as MessageDoc;
  if (data.authorUid !== uid) throw new HttpsError('permission-denied', 'Geen toegang.');
  if (data.status !== 'concept') throw new HttpsError('failed-precondition', 'Bericht is al gepubliceerd.');

  const now = admin.firestore.Timestamp.now();
  await ref.update({ status: 'gepubliceerd', updatedAt: now });

  // Update thread metadata + unread
  const threadRef = db.collection('groepen').doc(data.groepId).collection('threads').doc(data.threadId);
  const groepSnap = await db.collection('groepen').doc(data.groepId).get();
  const memberUids: string[] = (groepSnap.data() as GroepDoc).memberUids.filter((m: string) => m !== uid);

  const batch = db.batch();
  const threadUpdate: Record<string, unknown> = {
    lastMessageAt: now,
    lastMessageBody: data.body.substring(0, 100),
    updatedAt: now,
    messageCount: admin.firestore.FieldValue.increment(1),
  };
  for (const memberId of memberUids) {
    threadUpdate[`unreadPerUser.${memberId}`] = admin.firestore.FieldValue.increment(1);
  }
  batch.update(threadRef, threadUpdate);
  for (const memberId of memberUids) {
    batch.update(db.collection('users').doc(memberId), {
      [`unreadPerGroep.${data.groepId}`]: admin.firestore.FieldValue.increment(1),
    });
  }
  await batch.commit();

  return { success: true };
});

export const deleteMessageConcept = onCall({ region: REGION }, async (request) => {
  const auth = requireAuth(request);
  const { messageId } = request.data as { messageId: string };
  const uid = auth.uid;

  const ref = db.collection('messages').doc(messageId);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError('not-found', 'Concept niet gevonden.');
  const data = snap.data() as MessageDoc;
  if (data.authorUid !== uid) throw new HttpsError('permission-denied', 'Geen toegang.');
  if (data.status !== 'concept') throw new HttpsError('failed-precondition', 'Kan alleen concepten verwijderen.');

  await ref.delete();
  return { success: true };
});

export const pinThread = onCall({ region: REGION }, async (request) => {
  const auth = requireAuth(request);
  const { threadId, groepId } = request.data as { threadId: string; groepId: string };
  const claims = auth.token as Record<string, unknown>;
  if (!isAdminClaim(claims)) throw new HttpsError('permission-denied', 'Geen toegang.');

  const ref = db.collection('groepen').doc(groepId).collection('threads').doc(threadId);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError('not-found', 'Thread niet gevonden.');
  const data = snap.data() as ThreadDoc;
  const now = admin.firestore.Timestamp.now();
  await ref.update({ pinnedAt: data.pinnedAt ? null : now, updatedAt: now });
  return { success: true };
});

export const pinMessage = onCall({ region: REGION }, async (request) => {
  const auth = requireAuth(request);
  const { messageId } = request.data as { messageId: string };
  const claims = auth.token as Record<string, unknown>;
  if (!isAdminClaim(claims)) throw new HttpsError('permission-denied', 'Geen toegang.');

  const ref = db.collection('messages').doc(messageId);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError('not-found', 'Bericht niet gevonden.');
  const data = snap.data() as MessageDoc;
  const now = admin.firestore.Timestamp.now();
  await ref.update({ pinnedAt: data.pinnedAt ? null : now, updatedAt: now });
  return { success: true };
});

export const deleteMessage = onCall({ region: REGION }, async (request) => {
  const auth = requireAuth(request);
  const { messageId } = request.data as { messageId: string };
  const uid = auth.uid;
  const claims = auth.token as Record<string, unknown>;

  const ref = db.collection('messages').doc(messageId);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError('not-found', 'Bericht niet gevonden.');
  const data = snap.data() as MessageDoc;

  const isAuthor = data.authorUid === uid;
  const isAdmin = isAdminClaim(claims);
  if (!isAuthor && !isAdmin) throw new HttpsError('permission-denied', 'Geen toegang.');

  const now = admin.firestore.Timestamp.now();
  await ref.update({ deletedAt: now, body: '', updatedAt: now });
  return { success: true };
});

export const markMessageRead = onCall({ region: REGION }, async (request) => {
  const auth = requireAuth(request);
  const { messageId, threadId, groepId } = request.data as { messageId: string; threadId: string; groepId: string };
  const uid = auth.uid;

  const lezingRef = db.collection('messages').doc(messageId).collection('lezingen').doc(uid);
  const lezingSnap = await lezingRef.get();
  if (lezingSnap.exists) return { success: true }; // already read

  await lezingRef.set({ readAt: admin.firestore.Timestamp.now() });

  const threadRef = db.collection('groepen').doc(groepId).collection('threads').doc(threadId);

  // ── Guardian rule: collect all UIDs to mark as "seen" on the thread ────────
  const uidsToMark: string[] = [uid];
  const childSnap = await db.collection('members')
    .where('verzorgerIds', 'array-contains', uid)
    .get();
  childSnap.docs.forEach(d => uidsToMark.push(d.id));

  // Only add UIDs not already tracked (avoid over-incrementing the counter)
  const threadSnap = await threadRef.get();
  const threadData = threadSnap.data() as ThreadDoc;
  const currentSeenUids: string[] = threadData?.threadSeenByUids ?? [];
  const newUids = uidsToMark.filter(u => !currentSeenUids.includes(u));

  const batch = db.batch();
  batch.update(threadRef, {
    [`unreadPerUser.${uid}`]: admin.firestore.FieldValue.increment(-1),
  });
  batch.update(db.collection('users').doc(uid), {
    [`unreadPerGroep.${groepId}`]: admin.firestore.FieldValue.increment(-1),
  });

  // Update thread-level seen tracking
  if (newUids.length > 0) {
    batch.update(threadRef, {
      threadSeenByUids: admin.firestore.FieldValue.arrayUnion(...newUids),
      threadSeenCount: admin.firestore.FieldValue.increment(newUids.length),
    });
  }

  await batch.commit();
  return { success: true };
});

export const markMessageUnread = onCall({ region: REGION }, async (request) => {
  const auth = requireAuth(request);
  const { messageId, threadId, groepId } = request.data as { messageId: string; threadId: string; groepId: string };
  const uid = auth.uid;

  const lezingRef = db.collection('messages').doc(messageId).collection('lezingen').doc(uid);
  const lezingSnap = await lezingRef.get();
  if (!lezingSnap.exists) return { success: true }; // already unread

  await lezingRef.delete();

  const batch = db.batch();
  batch.update(db.collection('groepen').doc(groepId).collection('threads').doc(threadId), {
    [`unreadPerUser.${uid}`]: admin.firestore.FieldValue.increment(1),
  });
  batch.update(db.collection('users').doc(uid), {
    [`unreadPerGroep.${groepId}`]: admin.firestore.FieldValue.increment(1),
  });
  await batch.commit();

  return { success: true };
});

// ── getThreadLezingen ─────────────────────────────────────────────────────────
export const getThreadLezingen = onCall({ region: REGION }, async (request) => {
  const auth = requireAuth(request);
  const { threadId, groepId } = request.data as { threadId: string; groepId: string };
  const uid = auth.uid;

  const [threadSnap, groepSnap] = await Promise.all([
    db.collection('groepen').doc(groepId).collection('threads').doc(threadId).get(),
    db.collection('groepen').doc(groepId).get(),
  ]);

  if (!threadSnap.exists) throw new HttpsError('not-found', 'Thread niet gevonden.');
  const thread = threadSnap.data() as ThreadDoc;

  if (thread.authorUid !== uid) throw new HttpsError('permission-denied', 'Geen toegang.');

  const groep = groepSnap.data() as GroepDoc;
  const memberUids: string[] = groep.memberUids ?? [];
  const seenSet = new Set<string>(thread.threadSeenByUids ?? []);

  const memberDocs = await Promise.all(
    memberUids.map(mUid => db.collection('members').doc(mUid).get())
  );

  const lezingen = memberDocs.map(d => {
    const data = d.exists ? (d.data() as MemberDoc) : null;
    return {
      uid: d.id,
      displayName: data ? `${data.firstName} ${data.lastName}`.trim() : d.id,
      avatarUrl: data?.avatarUrl ?? null,
      gezien: seenSet.has(d.id),
    };
  });

  lezingen.sort((a, b) => {
    if (a.gezien !== b.gezien) return a.gezien ? -1 : 1;
    return a.displayName.localeCompare(b.displayName, 'nl');
  });

  return {
    lezingen,
    gezienCount: thread.threadSeenCount ?? 0,
    totalCount: memberUids.length,
  };
});

export const deleteThread = onCall({ region: REGION }, async (request) => {
  const auth = requireAuth(request);
  const { threadId, groepId } = request.data as { threadId: string; groepId: string };
  const uid = auth.uid;
  const claims = auth.token as Record<string, unknown>;

  const threadRef = db.collection('groepen').doc(groepId).collection('threads').doc(threadId);
  const threadSnap = await threadRef.get();
  if (!threadSnap.exists) throw new HttpsError('not-found', 'Thread niet gevonden.');
  const threadData = threadSnap.data() as ThreadDoc;

  const isAuthor = threadData.authorUid === uid;
  const isAdmin = isAdminClaim(claims);
  if (!isAuthor && !isAdmin) throw new HttpsError('permission-denied', 'Geen toegang.');

  // Delete all messages (and their lezingen subcollections) in batches
  const messagesSnap = await db.collection('messages')
    .where('threadId', '==', threadId)
    .get();

  // Delete lezingen subcollections for each message
  for (const msgDoc of messagesSnap.docs) {
    const lezingenSnap = await msgDoc.ref.collection('lezingen').get();
    const batch = db.batch();
    lezingenSnap.docs.forEach(l => batch.delete(l.ref));
    batch.delete(msgDoc.ref);
    await batch.commit();
  }

  // Delete the thread itself
  await threadRef.delete();

  return { success: true };
});

// ═══════════════════════════════════════════════════════════════════════════════
// Thread Concepten
// ═══════════════════════════════════════════════════════════════════════════════

// ── saveThreadConcept ─────────────────────────────────────────────────────────
export const saveThreadConcept = onCall({ region: REGION }, async (request) => {
  const auth = requireAuth(request);
  const { groepId, title, body, conceptId } = request.data as {
    groepId: string; title: string; body: string; conceptId?: string;
  };
  const uid = auth.uid;
  const claims = auth.token as Record<string, unknown>;

  if (!isNonLid(claims)) throw new HttpsError('permission-denied', 'Leden kunnen geen thread-concepten aanmaken.');
  if (!(await isGroepMember(groepId, uid))) throw new HttpsError('permission-denied', 'Geen lid van deze groep.');
  if (!title?.trim()) throw new HttpsError('invalid-argument', 'Titel is verplicht.');

  const memberSnap = await db.collection('members').doc(uid).get();
  const authorName = memberSnap.exists
    ? `${(memberSnap.data() as any).firstName} ${(memberSnap.data() as any).lastName}`.trim()
    : uid;

  const now = admin.firestore.Timestamp.now();

  if (conceptId) {
    const ref = db.collection('threadConcepten').doc(conceptId);
    const snap = await ref.get();
    if (!snap.exists) throw new HttpsError('not-found', 'Concept niet gevonden.');
    const existing = snap.data() as ThreadConceptDoc;
    if (existing.authorUid !== uid) throw new HttpsError('permission-denied', 'Geen toegang.');
    await ref.update({ title: title.trim(), body: body?.trim() ?? '', updatedAt: now });
    return { conceptId };
  } else {
    const ref = db.collection('threadConcepten').doc();
    const doc: ThreadConceptDoc = {
      id: ref.id,
      groepId,
      authorUid: uid,
      authorName,
      title: title.trim(),
      body: body?.trim() ?? '',
      createdAt: now,
      updatedAt: now,
    };
    await ref.set(doc);
    return { conceptId: ref.id };
  }
});

// ── publishThreadConcept ──────────────────────────────────────────────────────
export const publishThreadConcept = onCall({ region: REGION }, async (request) => {
  const auth = requireAuth(request);
  const { conceptId } = request.data as { conceptId: string };
  const uid = auth.uid;
  const claims = auth.token as Record<string, unknown>;

  const ref = db.collection('threadConcepten').doc(conceptId);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError('not-found', 'Concept niet gevonden.');
  const concept = snap.data() as ThreadConceptDoc;
  if (concept.authorUid !== uid) throw new HttpsError('permission-denied', 'Geen toegang.');

  if (!isNonLid(claims)) throw new HttpsError('permission-denied', 'Leden kunnen geen threads publiceren.');
  if (!(await isGroepMember(concept.groepId, uid))) throw new HttpsError('permission-denied', 'Geen lid van deze groep.');

  const { threadId } = await _createThreadInternal(uid, concept.groepId, concept.title, concept.body);
  await ref.delete();

  return { threadId };
});

// ── deleteThreadConcept ───────────────────────────────────────────────────────
export const deleteThreadConcept = onCall({ region: REGION }, async (request) => {
  const auth = requireAuth(request);
  const { conceptId } = request.data as { conceptId: string };
  const uid = auth.uid;

  const ref = db.collection('threadConcepten').doc(conceptId);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError('not-found', 'Concept niet gevonden.');
  const concept = snap.data() as ThreadConceptDoc;
  if (concept.authorUid !== uid) throw new HttpsError('permission-denied', 'Geen toegang.');

  await ref.delete();
  return { success: true };
});
