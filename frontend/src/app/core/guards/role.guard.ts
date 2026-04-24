import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, map, take } from 'rxjs';
import { AuthService } from '../auth/auth.service';

export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const requiredRoles: string[] = route.data['roles'] ?? [];

  // Wait until Firebase has restored auth state (loading = false) before deciding.
  return toObservable(auth.loading).pipe(
    filter(loading => !loading),
    take(1),
    map(() => {
      if (!auth.isAuthenticated()) {
        return router.createUrlTree(['/auth/login']);
      }
      if (requiredRoles.length === 0 || auth.hasAnyRole(requiredRoles)) return true;
      // Authenticated but missing required role — redirect to members
      return router.createUrlTree(['/members']);
    }),
  );
};
