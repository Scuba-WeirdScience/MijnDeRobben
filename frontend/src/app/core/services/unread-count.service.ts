import { Injectable, inject, signal, effect } from '@angular/core';
import { doc, onSnapshot } from 'firebase/firestore';
import { firestore } from '@fire';
import { AuthService } from '../auth/auth.service';

/**
 * UnreadCountService — narrow seam between the navbar and the Berichten feature.
 *
 * The navbar needs exactly one number: the total unread message count.
 * This service owns that signal and its Firestore listener, without pulling
 * in BerichtenService's full subscription machinery.
 *
 * Depth: one `Signal<number>` interface behind a Firestore listener + auth effect.
 */
@Injectable({ providedIn: 'root' })
export class UnreadCountService {
  private readonly auth = inject(AuthService);

  /** Total unread berichten count for the current user. */
  readonly unreadCount = signal<number>(0);

  private unsub: (() => void) | null = null;

  constructor() {
    effect(() => {
      this.unsub?.();
      this.unsub = null;

      const user = this.auth.currentUser();
      if (!user) {
        this.unreadCount.set(0);
        this._driveBadge(0);
        return;
      }

      this.unsub = onSnapshot(doc(firestore, 'users', user.uid), (snap) => {
        const data = snap.data() as { unreadCount?: number } | undefined;
        const count = data?.unreadCount ?? 0;
        this.unreadCount.set(count);
        this._driveBadge(count);
      });
    });
  }

  private _driveBadge(count: number): void {
    if ('setAppBadge' in navigator) {
      if (count > 0) {
        (navigator as unknown as { setAppBadge: (n: number) => void }).setAppBadge(count);
      } else {
        (navigator as unknown as { clearAppBadge: () => void }).clearAppBadge();
      }
    }
  }
}
