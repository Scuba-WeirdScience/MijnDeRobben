import * as admin from 'firebase-admin';

// Initialise once — safe to call multiple times (no-op if already initialised)
if (!admin.apps.length) {
  admin.initializeApp();
}

export const db = admin.firestore();
export const auth = admin.auth();
export const storage = admin.storage();
export { admin };

/**
 * Default region for all Cloud Functions v2 deployments.
 * Pass as: { region: REGION } in onCall / onRequest options.
 */
export const REGION = 'europe-west4';
