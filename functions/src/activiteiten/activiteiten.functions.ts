import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { db, REGION } from '../shared/admin';
import {
  LocatieDoc,
  ActiviteitDoc,
  ActiviteitOccurrenceDoc,
  ActiviteitRegistratieDoc,
  RecurrenceRule,
  RegistratiesZichtbaar,
} from '../shared/types';
import { requireAuth } from '../shared/auth-guards';

// ── Locaties ───────────────────────────────────────────────────────────────

export const getLocaties = onCall({ region: REGION }, async () => {
  const snap = await db.collection('locaties').orderBy('naam').get();
  return snap.docs.map(d => d.data() as LocatieDoc);
});

export const createLocatie = onCall({ region: REGION }, async (request) => {
  requireAuth(request);
  const { naam, adres, kaartLink, notities } = request.data as {
    naam: string;
    adres?: string | null;
    kaartLink?: string | null;
    notities?: string | null;
  };

  const now = new Date().toISOString();
  const ref = db.collection('locaties').doc();
  const doc: LocatieDoc = {
    id: ref.id,
    naam,
    adres: adres ?? null,
    kaartLink: kaartLink ?? null,
    notities: notities ?? null,
    createdAt: now,
    updatedAt: null,
  };
  await ref.set(doc);
  return doc;
});

export const updateLocatie = onCall({ region: REGION }, async (request) => {
  requireAuth(request);
  const { id, ...fields } = request.data as { id: string } & Partial<LocatieDoc>;
  const ref = db.collection('locaties').doc(id);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError('not-found', 'Locatie niet gevonden.');
  await ref.update({ ...fields, updatedAt: new Date().toISOString() });
  return (await ref.get()).data() as LocatieDoc;
});

export const deleteLocatie = onCall({ region: REGION }, async (request) => {
  requireAuth(request);
  const { id } = request.data as { id: string };
  const snap = await db.collection('locaties').doc(id).get();
  if (!snap.exists) throw new HttpsError('not-found', 'Locatie niet gevonden.');
  await snap.ref.delete();
  return { success: true };
});

// ── Activiteiten ──────────────────────────────────────────────────────────

export const getActiviteiten = onCall({ region: REGION }, async (request) => {
  const { van, tot } = (request.data ?? {}) as { van?: string; tot?: string };
  let query = db.collection('activiteiten').orderBy('startDatumTijd') as FirebaseFirestore.Query;
  if (van) query = query.where('startDatumTijd', '>=', van);
  if (tot) query = query.where('startDatumTijd', '<=', tot);
  const snap = await query.get();
  return snap.docs.map(d => d.data() as ActiviteitDoc);
});

export const getAllActiviteiten = onCall({ region: REGION }, async () => {
  const snap = await db.collection('activiteiten').orderBy('startDatumTijd').get();
  return snap.docs.map(d => d.data() as ActiviteitDoc);
});

export const getActiviteit = onCall({ region: REGION }, async (request) => {
  const { id } = request.data as { id: string };
  const snap = await db.collection('activiteiten').doc(id).get();
  if (!snap.exists) throw new HttpsError('not-found', 'Activiteit niet gevonden.');
  return snap.data() as ActiviteitDoc;
});

export const createActiviteit = onCall({ region: REGION }, async (request) => {
  const auth = requireAuth(request);
  const data = request.data as Omit<ActiviteitDoc, 'id' | 'createdAt' | 'updatedAt' | 'createdByUid'>;

  const now = new Date().toISOString();
  const ref = db.collection('activiteiten').doc();
  const doc: ActiviteitDoc = {
    id: ref.id,
    titel: data.titel,
    beschrijving: data.beschrijving ?? null,
    startDatumTijd: data.startDatumTijd,
    eindDatumTijd: data.eindDatumTijd,
    locatieId: data.locatieId ?? null,
    locatieNaam: data.locatieNaam ?? null,
    locatieVrij: data.locatieVrij ?? null,
    bannerUrl: data.bannerUrl ?? null,
    organisatorId: data.organisatorId ?? null,
    organisatorNaam: data.organisatorNaam ?? null,
    organisatorLeden: data.organisatorLeden ?? [],
    organisatorGroepId: data.organisatorGroepId ?? null,
    inschrijvingenActief: data.inschrijvingenActief ?? false,
    maxDeelnemers: data.maxDeelnemers ?? null,
    registratiesZichtbaar: data.registratiesZichtbaar ?? 'iedereen',
    gasten: data.gasten ?? false,
    maxGastenPerInschrijving: data.maxGastenPerInschrijving ?? null,
    gastKosten: data.gastKosten ?? null,
    lidKosten: data.lidKosten ?? null,
    isHerhalend: data.isHerhalend ?? false,
    recurrenceRule: data.recurrenceRule ?? null,
    isPubliek: data.isPubliek ?? false,
    threadId: data.threadId ?? null,
    groepId: data.groepId ?? null,
    createdAt: now,
    updatedAt: null,
    createdByUid: auth.uid,
  };
  await ref.set(doc);
  return doc;
});

export type EditScope = 'single' | 'future' | 'all';

export const updateActiviteit = onCall({ region: REGION }, async (request) => {
  requireAuth(request);
  const { id, scope, occurrenceDatum, ...fields } = request.data as {
    id: string;
    scope: EditScope;
    occurrenceDatum?: string;
  } & Partial<ActiviteitDoc>;

  const now = new Date().toISOString();

  if (scope === 'all') {
    // Update the master document
    const ref = db.collection('activiteiten').doc(id);
    const snap = await ref.get();
    if (!snap.exists) throw new HttpsError('not-found', 'Activiteit niet gevonden.');
    await ref.update({ ...fields, updatedAt: now });
    return (await ref.get()).data() as ActiviteitDoc;
  }

  if (scope === 'future') {
    // Split the recurrence: truncate master at occurrenceDatum, create new master from occurrenceDatum
    if (!occurrenceDatum) throw new HttpsError('invalid-argument', 'occurrenceDatum is verplicht voor scope future.');
    const masterRef = db.collection('activiteiten').doc(id);
    const masterSnap = await masterRef.get();
    if (!masterSnap.exists) throw new HttpsError('not-found', 'Activiteit niet gevonden.');
    const master = masterSnap.data() as ActiviteitDoc;

    // Truncate original
    const originalRule: RecurrenceRule | null = master.recurrenceRule
      ? { ...master.recurrenceRule, endsOn: occurrenceDatum }
      : null;
    await masterRef.update({ recurrenceRule: originalRule, updatedAt: now });

    // Create new master from occurrenceDatum onward
    const newRef = db.collection('activiteiten').doc();
    const newDoc: ActiviteitDoc = {
      ...master,
      ...fields,
      id: newRef.id,
      startDatumTijd: fields.startDatumTijd ?? occurrenceDatum + 'T' + master.startDatumTijd.split('T')[1],
      createdAt: now,
      updatedAt: null,
    };
    if (newDoc.recurrenceRule) {
      // Remove endsOn truncation from new master
      newDoc.recurrenceRule = { ...newDoc.recurrenceRule, endsOn: master.recurrenceRule?.endsOn ?? null };
    }
    await newRef.set(newDoc);
    return newDoc;
  }

  // scope === 'single': create/update an ActiviteitOccurrenceDoc
  if (!occurrenceDatum) throw new HttpsError('invalid-argument', 'occurrenceDatum is verplicht voor scope single.');
  const occId = `${id}_${occurrenceDatum}`;
  const occRef = db.collection('activiteitOccurrences').doc(occId);
  const existing = await occRef.get();

  const occDoc: ActiviteitOccurrenceDoc = {
    id: occId,
    activiteitId: id,
    occurrenceDatum,
    status: 'modified',
    ...(fields.titel !== undefined && { titel: fields.titel }),
    ...(fields.beschrijving !== undefined && { beschrijving: fields.beschrijving }),
    ...(fields.startDatumTijd !== undefined && { startDatumTijd: fields.startDatumTijd }),
    ...(fields.eindDatumTijd !== undefined && { eindDatumTijd: fields.eindDatumTijd }),
    ...(fields.locatieId !== undefined && { locatieId: fields.locatieId }),
    ...(fields.locatieNaam !== undefined && { locatieNaam: fields.locatieNaam }),
    ...(fields.bannerUrl !== undefined && { bannerUrl: fields.bannerUrl }),
    ...(fields.maxDeelnemers !== undefined && { maxDeelnemers: fields.maxDeelnemers }),
    createdAt: existing.exists ? (existing.data() as ActiviteitOccurrenceDoc).createdAt : now,
    updatedAt: now,
  };
  await occRef.set(occDoc);
  return occDoc;
});

export const deleteActiviteit = onCall({ region: REGION }, async (request) => {
  requireAuth(request);
  const { id, scope, occurrenceDatum } = request.data as {
    id: string;
    scope: EditScope;
    occurrenceDatum?: string;
  };

  const now = new Date().toISOString();

  if (scope === 'all') {
    // Delete master + all overrides + all registraties
    const batch = db.batch();
    batch.delete(db.collection('activiteiten').doc(id));

    const overridesSnap = await db.collection('activiteitOccurrences').where('activiteitId', '==', id).get();
    overridesSnap.docs.forEach(d => batch.delete(d.ref));

    const registratiesSnap = await db.collection('activiteitRegistraties').where('activiteitId', '==', id).get();
    registratiesSnap.docs.forEach(d => batch.delete(d.ref));

    await batch.commit();
    return { success: true };
  }

  if (scope === 'future') {
    if (!occurrenceDatum) throw new HttpsError('invalid-argument', 'occurrenceDatum is verplicht voor scope future.');
    const ref = db.collection('activiteiten').doc(id);
    const snap = await ref.get();
    if (!snap.exists) throw new HttpsError('not-found', 'Activiteit niet gevonden.');
    const master = snap.data() as ActiviteitDoc;
    const updatedRule: RecurrenceRule | null = master.recurrenceRule
      ? { ...master.recurrenceRule, endsOn: occurrenceDatum }
      : null;
    await ref.update({ recurrenceRule: updatedRule, updatedAt: now });
    return { success: true };
  }

  // scope === 'single'
  if (!occurrenceDatum) throw new HttpsError('invalid-argument', 'occurrenceDatum is verplicht voor scope single.');
  const occId = `${id}_${occurrenceDatum}`;
  const occRef = db.collection('activiteitOccurrences').doc(occId);
  const existing = await occRef.get();

  const cancelDoc: ActiviteitOccurrenceDoc = {
    id: occId,
    activiteitId: id,
    occurrenceDatum,
    status: 'cancelled',
    createdAt: existing.exists ? (existing.data() as ActiviteitOccurrenceDoc).createdAt : now,
    updatedAt: now,
  };
  await occRef.set(cancelDoc);
  return { success: true };
});

export const getOccurrenceOverrides = onCall({ region: REGION }, async (request) => {
  const { activiteitId } = request.data as { activiteitId: string };
  const snap = await db
    .collection('activiteitOccurrences')
    .where('activiteitId', '==', activiteitId)
    .get();
  return snap.docs.map(d => d.data() as ActiviteitOccurrenceDoc);
});

export const getAllOccurrenceOverrides = onCall({ region: REGION }, async () => {
  const snap = await db.collection('activiteitOccurrences').get();
  return snap.docs.map(d => d.data() as ActiviteitOccurrenceDoc);
});

// ── Registraties ──────────────────────────────────────────────────────────

export const registreerVoorActiviteit = onCall({ region: REGION }, async (request) => {
  const auth = requireAuth(request);
  const { activiteitId, occurrenceDatum, aantalGasten, opmerking } = request.data as {
    activiteitId: string;
    occurrenceDatum: string;
    aantalGasten: number;
    opmerking?: string | null;
  };

  // Fetch member info for denormalization
  const memberSnap = await db.collection('members').where('userId', '==', auth.uid).limit(1).get();
  if (memberSnap.empty) throw new HttpsError('not-found', 'Lid niet gevonden.');
  const member = memberSnap.docs[0].data();

  // Check activiteit exists + inschrijvingen active
  const activiteitSnap = await db.collection('activiteiten').doc(activiteitId).get();
  if (!activiteitSnap.exists) throw new HttpsError('not-found', 'Activiteit niet gevonden.');
  const activiteit = activiteitSnap.data() as ActiviteitDoc;
  if (!activiteit.inschrijvingenActief) {
    throw new HttpsError('failed-precondition', 'Inschrijvingen zijn niet actief voor deze activiteit.');
  }

  // Check max deelnemers
  if (activiteit.maxDeelnemers !== null) {
    const countSnap = await db
      .collection('activiteitRegistraties')
      .where('activiteitId', '==', activiteitId)
      .where('occurrenceDatum', '==', occurrenceDatum)
      .where('status', '==', 'aangemeld')
      .get();
    if (countSnap.size >= activiteit.maxDeelnemers) {
      throw new HttpsError('resource-exhausted', 'Maximum aantal deelnemers bereikt.');
    }
  }

  const now = new Date().toISOString();
  const docId = `${activiteitId}_${occurrenceDatum}_${member['id']}`;
  const ref = db.collection('activiteitRegistraties').doc(docId);

  const doc: ActiviteitRegistratieDoc = {
    id: docId,
    activiteitId,
    occurrenceDatum,
    memberId: member['id'] as string,
    memberUid: auth.uid,
    memberNaam: `${member['firstName']} ${member['lastName']}`,
    aantalGasten: aantalGasten ?? 0,
    opmerking: opmerking ?? null,
    status: 'aangemeld',
    createdAt: now,
    updatedAt: null,
  };
  await ref.set(doc);
  return doc;
});

export const annuleerRegistratie = onCall({ region: REGION }, async (request) => {
  const auth = requireAuth(request);
  const { activiteitId, occurrenceDatum } = request.data as {
    activiteitId: string;
    occurrenceDatum: string;
  };

  const memberSnap = await db.collection('members').where('userId', '==', auth.uid).limit(1).get();
  if (memberSnap.empty) throw new HttpsError('not-found', 'Lid niet gevonden.');
  const memberId = memberSnap.docs[0].data()['id'] as string;

  const docId = `${activiteitId}_${occurrenceDatum}_${memberId}`;
  const ref = db.collection('activiteitRegistraties').doc(docId);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError('not-found', 'Registratie niet gevonden.');

  await ref.update({ status: 'afgemeld', updatedAt: new Date().toISOString() });
  return { success: true };
});

export const getRegistratiesVoorOccurrence = onCall({ region: REGION }, async (request) => {
  requireAuth(request);
  const { activiteitId, occurrenceDatum } = request.data as {
    activiteitId: string;
    occurrenceDatum: string;
  };

  const snap = await db
    .collection('activiteitRegistraties')
    .where('activiteitId', '==', activiteitId)
    .where('occurrenceDatum', '==', occurrenceDatum)
    .orderBy('createdAt')
    .get();
  return snap.docs.map(d => d.data() as ActiviteitRegistratieDoc);
});

export const getMijnRegistraties = onCall({ region: REGION }, async (request) => {
  const auth = requireAuth(request);
  const snap = await db
    .collection('activiteitRegistraties')
    .where('memberUid', '==', auth.uid)
    .orderBy('occurrenceDatum')
    .get();
  return snap.docs.map(d => d.data() as ActiviteitRegistratieDoc);
});

export const updateRegistratieStatus = onCall({ region: REGION }, async (request) => {
  requireAuth(request);
  const { registratieId, status } = request.data as {
    registratieId: string;
    status: ActiviteitRegistratieDoc['status'];
  };
  const ref = db.collection('activiteitRegistraties').doc(registratieId);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError('not-found', 'Registratie niet gevonden.');
  await ref.update({ status, updatedAt: new Date().toISOString() });
  return (await ref.get()).data() as ActiviteitRegistratieDoc;
});

export const resetInschrijvingen = onCall({ region: REGION }, async (request) => {
  const auth = requireAuth(request);
  const { activiteitId, occurrenceDatum } = request.data as {
    activiteitId: string;
    occurrenceDatum: string;
  };

  // Fetch activiteit for organisator check
  const activiteitSnap = await db.collection('activiteiten').doc(activiteitId).get();
  if (!activiteitSnap.exists) throw new HttpsError('not-found', 'Activiteit niet gevonden.');
  const activiteit = activiteitSnap.data() as ActiviteitDoc;

  // Auth: Beheer/Bestuur OR organisator (losse leden of groep-organisator)
  const token = auth.token as Record<string, unknown>;
  const isAdmin = token['Beheer'] === true || token['Bestuur'] === true;

  if (!isAdmin) {
    // Check if caller is an organisator member
    const memberSnap = await db.collection('members').where('userId', '==', auth.uid).limit(1).get();
    if (memberSnap.empty) throw new HttpsError('permission-denied', 'Geen toegang.');
    const memberId = memberSnap.docs[0].data()['id'] as string;
    const isOrganisatorLid = (activiteit.organisatorLeden ?? []).includes(memberId)
      || activiteit.organisatorId === memberId;
    if (!isOrganisatorLid) throw new HttpsError('permission-denied', 'Geen toegang.');
  }

  // Hard delete all registraties for this occurrence
  const snap = await db
    .collection('activiteitRegistraties')
    .where('activiteitId', '==', activiteitId)
    .where('occurrenceDatum', '==', occurrenceDatum)
    .get();

  if (snap.empty) return { deleted: 0 };

  const BATCH_SIZE = 500;
  let deleted = 0;
  for (let i = 0; i < snap.docs.length; i += BATCH_SIZE) {
    const batch = db.batch();
    snap.docs.slice(i, i + BATCH_SIZE).forEach(d => batch.delete(d.ref));
    await batch.commit();
    deleted += Math.min(BATCH_SIZE, snap.docs.length - i);
  }

  return { deleted };
});

// Keep RegistratiesZichtbaar in scope (used by other modules that import types)
export type { RegistratiesZichtbaar };

// ── getActiviteitByThreadId ───────────────────────────────────────────────────

/** Returns the activiteit linked to the given threadId, or null if none. */
export const getActiviteitByThreadId = onCall({ region: REGION }, async (request) => {
  requireAuth(request);
  const { threadId } = request.data as { threadId: string };
  const snap = await db.collection('activiteiten')
    .where('threadId', '==', threadId)
    .limit(1)
    .get();
  if (snap.empty) return null;
  return snap.docs[0].data() as ActiviteitDoc;
});
