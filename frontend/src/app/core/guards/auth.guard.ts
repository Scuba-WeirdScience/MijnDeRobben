import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, map, take } from 'rxjs';
import { AuthService } from '../auth/auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  // Wait until Firebase has restored auth state (loading = false) before deciding.
  return toObservable(auth.loading).pipe(
    filter(loading => !loading),
    take(1),
    map(() => auth.isAuthenticated() ? true : router.createUrlTree(['/auth/login'])),
  );
};
