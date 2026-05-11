import { Injectable, signal, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  IdTokenResult,
} from 'firebase/auth';
import { auth } from '@fire';
import { call } from '../firebase/callable';
import { AppUser } from '../models/user.model';
import { ThemeService } from '../services/theme.service';

export class LoginApiError extends Error {
  constructor(
    public readonly code: string,
    public readonly requiresValidation: boolean = false,
  ) {
    super(code);
    this.name = 'LoginApiError';
  }
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly router = inject(Router);
  private readonly themeService = inject(ThemeService);

  private readonly _currentUser = signal<AppUser | null>(null);
  private readonly _loading = signal(true);

  readonly currentUser = this._currentUser.asReadonly();
  readonly isAuthenticated = computed(() => this._currentUser() !== null);
  readonly loading = this._loading.asReadonly();

  constructor() {
    // Subscribe to Firebase Auth state — fires immediately with current state
    onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        // Force-refresh the token so we always get the latest custom claims
        // (important in dev: emulator claims are reset on every restart).
        await fbUser.getIdToken(true);
        this._currentUser.set(await this.toAppUser(fbUser));
        // Load persisted user settings (theme etc.) from Firestore
        await this.themeService.loadFromFirestore();
      } else {
        this._currentUser.set(null);
      }
      this._loading.set(false);
    });
  }

  async login(email: string, password: string): Promise<void> {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged above will update _currentUser automatically
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? 'UnknownError';
      throw new LoginApiError(code);
    }
  }

  /**
   * Called on first login when the user must verify their identity via
   * geboortedatum. Invokes the validateGeboortedatum Cloud Function.
   */
  async validateGeboortedatum(geboortedatum: string): Promise<void> {
    const result = await call<{ geboortedatum: string }, { success: boolean }>(
      'validateGeboortedatum',
      { geboortedatum },
    );
    if (!result.success) {
      throw new LoginApiError('InvalidGeboortedatum');
    }
    // Refresh token so custom claims (isValidated) are picked up
    await auth.currentUser?.getIdToken(true);
    const fbUser = auth.currentUser;
    if (fbUser) {
      this._currentUser.set(await this.toAppUser(fbUser));
    }
  }

  async logout(): Promise<void> {
    await signOut(auth);
    this._currentUser.set(null);
    this.router.navigate(['/auth/login']);
  }

  hasRole(role: string): boolean {
    return this._currentUser()?.roles.includes(role) ?? false;
  }

  hasAnyRole(roles: string[]): boolean {
    return roles.some(r => this.hasRole(r));
  }

  /** Force-refreshes the ID token and updates the in-memory user (e.g. after role change). */
  async refreshUser(): Promise<void> {
    const fbUser = auth.currentUser;
    if (fbUser) {
      await fbUser.getIdToken(true);
      this._currentUser.set(await this.toAppUser(fbUser));
    }
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  private async toAppUser(fbUser: FirebaseUser): Promise<AppUser> {
    const tokenResult: IdTokenResult = await fbUser.getIdTokenResult();
    const claims = tokenResult.claims as Record<string, unknown>;

    const allRoles = ['Beheer', 'Lid', 'Bestuur', 'MateriaalCommissie', 'InstructieKader'];
    const roles = allRoles.filter(r => claims[r] === true);

    return {
      uid: fbUser.uid,
      email: fbUser.email ?? '',
      roles,
    };
  }
}

