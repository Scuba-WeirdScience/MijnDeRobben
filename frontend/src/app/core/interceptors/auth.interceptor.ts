// Auth interceptor — retained as a no-op.
// Firebase callable functions include the ID token automatically via the
// Firebase SDK. HttpClient is only used for non-API requests (e.g. asset
// loading), so no Authorization header injection is needed.
import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => next(req);
