// Error interceptor — retained for generic HTTP error toasts (asset loading, etc.)
// Token refresh logic has been removed; Firebase handles auth automatically.
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ToastService } from '../../shared/components/toast/toast.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const toast = inject(ToastService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 403) {
        toast.error('Je hebt geen toegang tot deze actie.');
      } else if (error.status === 0) {
        toast.error('Server is niet bereikbaar. Controleer je verbinding.');
      } else if (error.status >= 500) {
        toast.error('Er is een serverfout opgetreden. Probeer het opnieuw.');
      }
      return throwError(() => error);
    }),
  );
};
