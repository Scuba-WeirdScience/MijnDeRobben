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

  /** Total unread count: legacy berichten + all thread messages across all groepen. */
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
        const data = snap.data() as { unreadCount?: number; unreadPerGroep?: Record<string, number> } | undefined;
        const legacyCount = data?.unreadCount ?? 0;
        const threadCount = data?.unreadPerGroep
          ? Object.values(data.unreadPerGroep).reduce((sum, n) => sum + (n ?? 0), 0)
          : 0;
        const total = legacyCount + threadCount;
        this.unreadCount.set(total);
        this._driveBadge(total);
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
