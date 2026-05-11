import { HttpsError, CallableRequest } from 'firebase-functions/v2/https';

type Role = 'Beheer' | 'Lid' | 'Bestuur' | 'MateriaalCommissie' | 'InstructieKader';

/**
 * Asserts the caller is authenticated. Returns the auth token.
 * Throws HttpsError('unauthenticated') otherwise.
 */
export function requireAuth(request: CallableRequest): NonNullable<CallableRequest['auth']> {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Niet ingelogd.');
  return request.auth;
}

/**
 * Asserts the caller has a specific role.
 * Throws HttpsError('permission-denied') otherwise.
 */
export function requireRole(request: CallableRequest, role: Role): NonNullable<CallableRequest['auth']> {
  const auth = requireAuth(request);
  if (!auth.token[role]) {
    throw new HttpsError('permission-denied', `Rol vereist: ${role}.`);
  }
  return auth;
}

/**
 * Asserts the caller has at least one of the given roles.
 * Throws HttpsError('permission-denied') otherwise.
 */
export function requireAnyRole(request: CallableRequest, roles: Role[]): NonNullable<CallableRequest['auth']> {
  const auth = requireAuth(request);
  const hasRole = roles.some(r => auth.token[r]);
  if (!hasRole) {
    throw new HttpsError('permission-denied', `Een van deze rollen is vereist: ${roles.join(', ')}.`);
  }
  return auth;
}
