/**
 * Typed Firebase Callable helper
 *
 * This is the single seam between the frontend and Cloud Functions transport.
 * All callable invocations use `call()` instead of raw `httpsCallable`.
 *
 * Benefits:
 * - Function names are the only thing at each call site (no repeated generic params for the wrapper)
 * - Transport is swappable in one place
 * - Easy to mock in tests by replacing this module
 */
import { httpsCallable } from 'firebase/functions';
import { functions } from '@fire';

/**
 * Invoke a Firebase Callable Function by name and return its data directly.
 * Equivalent to `httpsCallable(functions, name)(data).then(r => r.data)`.
 */
export function call<I, O>(name: string, data?: I): Promise<O> {
  const fn = httpsCallable<I, O>(functions, name);
  return fn(data as I).then(r => r.data);
}
