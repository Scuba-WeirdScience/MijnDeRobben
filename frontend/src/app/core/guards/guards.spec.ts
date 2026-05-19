import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  provideRouter,
  Router,
  RouterStateSnapshot,
} from '@angular/router';
import { signal } from '@angular/core';
import { authGuard } from './auth.guard';
import { roleGuard } from './role.guard';
import { AuthService } from '../auth/auth.service';

// ── AuthService stub ─────────────────────────────────────────────────────────

function makeAuthStub(opts: { loading: boolean; authenticated: boolean; roles?: string[] }) {
  return {
    loading:         signal(opts.loading).asReadonly(),
    isAuthenticated: signal(opts.authenticated).asReadonly(),
    hasAnyRole: (required: string[]) =>
      (opts.roles ?? []).some(r => required.includes(r)),
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function runGuard(
  guardFn: typeof authGuard,
  authStub: ReturnType<typeof makeAuthStub>,
  routeData: Record<string, unknown> = {},
): Promise<boolean | import('@angular/router').UrlTree> {
  TestBed.overrideProvider(AuthService, { useValue: authStub });
  const route = { data: routeData } as unknown as ActivatedRouteSnapshot;
  const state = {} as RouterStateSnapshot;
  const result = TestBed.runInInjectionContext(() => guardFn(route, state));
  // Result may be Observable or UrlTree/boolean
  if (typeof result === 'boolean' || result instanceof URL) {
    return Promise.resolve(result as boolean);
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new Promise(resolve => (result as any).subscribe(resolve));
}

// ── authGuard ────────────────────────────────────────────────────────────────

describe('authGuard', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
  });

  it('allows navigation when authenticated', async () => {
    const stub = makeAuthStub({ loading: false, authenticated: true });
    const result = await runGuard(authGuard, stub);
    expect(result).toBeTrue();
  });

  it('redirects to /auth/login when not authenticated', async () => {
    const stub = makeAuthStub({ loading: false, authenticated: false });
    const result = await runGuard(authGuard, stub);
    const router = TestBed.inject(Router);
    expect(result).toEqual(router.createUrlTree(['/auth/login']));
  });
});

// ── roleGuard ────────────────────────────────────────────────────────────────

describe('roleGuard', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
  });

  it('allows navigation when authenticated and no roles required', async () => {
    const stub = makeAuthStub({ loading: false, authenticated: true, roles: [] });
    const result = await runGuard(roleGuard, stub, { roles: [] });
    expect(result).toBeTrue();
  });

  it('allows navigation when user has required role', async () => {
    const stub = makeAuthStub({ loading: false, authenticated: true, roles: ['Beheer'] });
    const result = await runGuard(roleGuard, stub, { roles: ['Beheer'] });
    expect(result).toBeTrue();
  });

  it('redirects to /members when authenticated but missing role', async () => {
    const stub = makeAuthStub({ loading: false, authenticated: true, roles: ['Lid'] });
    const result = await runGuard(roleGuard, stub, { roles: ['Beheer'] });
    const router = TestBed.inject(Router);
    expect(result).toEqual(router.createUrlTree(['/members']));
  });

  it('redirects to /auth/login when not authenticated', async () => {
    const stub = makeAuthStub({ loading: false, authenticated: false });
    const result = await runGuard(roleGuard, stub, { roles: ['Beheer'] });
    const router = TestBed.inject(Router);
    expect(result).toEqual(router.createUrlTree(['/auth/login']));
  });
});
