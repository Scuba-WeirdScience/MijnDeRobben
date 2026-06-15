import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import { db, REGION } from '../shared/admin';
import { MateriaalDoc, MateriaalTypeDoc } from '../shared/types';

function requireMateriaalCommissie(request: CallableRequest) {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Not signed in.');
  const t = request.auth.token;
  if (!t['MateriaalCommissie'] && !t['Bestuur'] && !t['Beheer']) {
    throw new HttpsError('permission-denied', 'Geen toegang.');
  }
}

// ── getMateriaalTypes ──────────────────────────────────────────────────────
export const getMateriaalTypes = onCall({ region: REGION }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Not signed in.');
  const snap = await db.collection('materiaal-types').orderBy('volgorde').get();
  return snap.docs.map(d => d.data());
});

// ── getMateriaalTypesWithMaterialen ───────────────────────────────────────
export const getMateriaalTypesWithMaterialen = onCall({ region: REGION }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Not signed in.');

  const typesSnap = await db.collection('materiaal-types').orderBy('volgorde').get();
  const results = await Promise.all(typesSnap.docs.map(async (typeDoc) => {
    const type = typeDoc.data() as MateriaalTypeDoc;
    const materiaalSnap = await db.collection('materialen')
      .where('materiaalTypeId', '==', type.id)
      .orderBy('naam')
      .get();
    return { ...type, materialen: materiaalSnap.docs.map(d => d.data() as MateriaalDoc) };
  }));

  return results;
});

// ── createMateriaalType ────────────────────────────────────────────────────
export const createMateriaalType = onCall({ region: REGION }, async (request) => {
  requireMateriaalCommissie(request);
  const { naam, beschrijving, volgorde, maxLeningenPerLid, huurprijs, borg, customProperties } = request.data as {
    naam: string; beschrijving?: string | null; volgorde: number;
    maxLeningenPerLid?: number | null; huurprijs?: number | null;
    borg?: number | null;
    customProperties?: MateriaalTypeDoc['customProperties'];
  };

  const now = new Date().toISOString();
  const ref = db.collection('materiaal-types').doc();
  const doc: MateriaalTypeDoc = {
    id: ref.id, naam,
    beschrijving: beschrijving ?? null,
    volgorde,
    maxLeningenPerLid: maxLeningenPerLid ?? null,
    huurprijs: huurprijs ?? null,
    borg: borg ?? null,
    customProperties: customProperties ?? null,
    createdAt: now, updatedAt: null,
  };
  await ref.set(doc);
  return doc;
});

// ── updateMateriaalType ────────────────────────────────────────────────────
export const updateMateriaalType = onCall({ region: REGION }, async (request) => {
  requireMateriaalCommissie(request);
  const { id, ...fields } = request.data as { id: string } & Partial<MateriaalTypeDoc>;
  const ref = db.collection('materiaal-types').doc(id);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError('not-found', 'MateriaalType niet gevonden.');
  await ref.update({ ...fields, updatedAt: new Date().toISOString() });
  return (await ref.get()).data();
});

// ── deleteMateriaalType ────────────────────────────────────────────────────
export const deleteMateriaalType = onCall({ region: REGION }, async (request) => {
  requireMateriaalCommissie(request);
  const { id } = request.data as { id: string };

  const materiaalSnap = await db.collection('materialen').where('materiaalTypeId', '==', id).get();
  const batch = db.batch();
  materiaalSnap.docs.forEach(d => batch.delete(d.ref));
  batch.delete(db.collection('materiaal-types').doc(id));
  await batch.commit();
  return { success: true };
});

// ── getMaterialenByType ────────────────────────────────────────────────────
export const getMaterialenByType = onCall({ region: REGION }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Not signed in.');
  const { typeId } = request.data as { typeId: string };
  const snap = await db.collection('materialen').where('materiaalTypeId', '==', typeId).orderBy('naam').get();
  return snap.docs.map(d => d.data());
});

// ── createMateriaal ────────────────────────────────────────────────────────
export const createMateriaal = onCall({ region: REGION }, async (request) => {
  requireMateriaalCommissie(request);
  const { materiaalTypeId, naam, serienummer, notities, aankoopDatum, customProperties } = request.data as {
    materiaalTypeId: string; naam: string; serienummer?: string | null;
    notities?: string | null; aankoopDatum?: string | null;
    customProperties?: Record<string, string> | null;
  };

  const now = new Date().toISOString();
  const ref = db.collection('materialen').doc();
  const doc: MateriaalDoc = {
    id: ref.id, materiaalTypeId, naam,
    serienummer: serienummer ?? null,
    notities: notities ?? null,
    aankoopDatum: aankoopDatum ?? null,
    actief: false,
    customProperties: customProperties ?? null,
    createdAt: now, updatedAt: null,
  };
  await ref.set(doc);
  return doc;
});

// ── updateMateriaal ────────────────────────────────────────────────────────
export const updateMateriaal = onCall({ region: REGION }, async (request) => {
  requireMateriaalCommissie(request);
  const { id, ...fields } = request.data as { id: string } & Partial<MateriaalDoc>;
  const ref = db.collection('materialen').doc(id);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError('not-found', 'Materiaal niet gevonden.');
  await ref.update({ ...fields, updatedAt: new Date().toISOString() });
  return (await ref.get()).data();
});

// ── deleteMateriaal ────────────────────────────────────────────────────────
export const deleteMateriaal = onCall({ region: REGION }, async (request) => {
  requireMateriaalCommissie(request);
  const { id } = request.data as { id: string };
  const snap = await db.collection('materialen').doc(id).get();
  if (!snap.exists) throw new HttpsError('not-found', 'Materiaal niet gevonden.');
  await snap.ref.delete();
  return { success: true };
});
