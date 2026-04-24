import { Injectable, signal } from '@angular/core';

/**
 * Singleton signal service that holds the current user's avatar URL.
 * Written to by ProfileComponent after upload/delete.
 * Read by NavbarComponent to show the circular avatar.
 */
@Injectable({ providedIn: 'root' })
export class AvatarStateService {
  private readonly _avatarUrl = signal<string | null>(null);

  /** Current avatar URL (null = no avatar / show initials). */
  readonly avatarUrl = this._avatarUrl.asReadonly();

  /** Update the avatar URL (called after upload or delete). */
  setAvatarUrl(url: string | null): void {
    this._avatarUrl.set(url);
  }
}
