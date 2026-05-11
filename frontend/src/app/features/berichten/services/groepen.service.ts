import { Injectable, inject, signal, computed, effect } from '@angular/core';
import { collection, query, where, orderBy, onSnapshot, doc } from 'firebase/firestore';
import { firestore } from '@fire';
import { AuthService } from '../../../core/auth/auth.service';
import { UnreadCountService } from '../../../core/services/unread-count.service';
import { call } from '../../../core/firebase/callable';

export interface Groep {
  id: string;
  name: string;
  description: string;
  memberUids: string[];
  unreadCount: number;
}

@Injectable({ providedIn: 'root' })
export class GroepenService {
  private readonly auth = inject(AuthService);
  private readonly unreadCountService = inject(UnreadCountService);

  readonly unreadCount = this.unreadCountService.unreadCount;
  readonly unreadPerGroep = signal<Record<string, number>>({});
  readonly groepen = signal<Groep[]>([]);
  readonly allGroepen = signal<Groep[]>([]);
  readonly loadingGroepen = signal<boolean>(false);

  readonly activeGroepId = signal<string | null>(null);
  readonly activeGroep = computed(() =>
    this.groepen().find(g => g.id === this.activeGroepId()) ?? null
  );

  private _unsubPerGroep: (() => void) | null = null;
  private unsubGroepen: (() => void) | null = null;
  private unsubAllGroepen: (() => void) | null = null;

  constructor() {
    effect(() => {
      const user = this.auth.currentUser();

      this.unsubGroepen?.();
      this.unsubAllGroepen?.();
      this._unsubPerGroep?.();
      this.unsubGroepen = null;
      this.unsubAllGroepen = null;
      this._unsubPerGroep = null;

      if (!user) {
        this.unreadPerGroep.set({});
        this.groepen.set([]);
        this.allGroepen.set([]);
        this.activeGroepId.set(null);
        return;
      }

      const uid = user.uid;

      this._unsubPerGroep = onSnapshot(doc(firestore, 'users', uid), (snap) => {
        const data = snap.data() as { unreadPerGroep?: Record<string, number> } | undefined;
        this.unreadPerGroep.set(data?.unreadPerGroep ?? {});
      });

      const groepenQ = query(
        collection(firestore, 'groepen'),
        where('memberUids', 'array-contains', uid),
        orderBy('name', 'asc')
      );
      this.loadingGroepen.set(true);
      this.unsubGroepen = onSnapshot(groepenQ, (snap) => {
        const groepen: Groep[] = snap.docs.map(d => {
          const data = d.data();
          return {
            id: d.id,
            name: data['name'],
            description: data['description'] ?? '',
            memberUids: data['memberUids'] ?? [],
            unreadCount: this.unreadPerGroep()[d.id] ?? 0,
          };
        });
        this.groepen.set(groepen);
        this.loadingGroepen.set(false);
      });

      const allGroepenQ = query(
        collection(firestore, 'groepen'),
        orderBy('name', 'asc')
      );
      this.unsubAllGroepen = onSnapshot(allGroepenQ, (snap) => {
        const all: Groep[] = snap.docs.map(d => {
          const data = d.data();
          return {
            id: d.id,
            name: data['name'],
            description: data['description'] ?? '',
            memberUids: data['memberUids'] ?? [],
            unreadCount: this.unreadPerGroep()[d.id] ?? 0,
          };
        });
        this.allGroepen.set(all);
      });
    });
  }

  selectGroep(groepId: string): void {
    this.activeGroepId.set(groepId);
  }

  createGroep(data: { name: string; description: string; memberUids: string[] }): Promise<{ id: string }> {
    return call<typeof data, { id: string }>('createGroep', data);
  }

  updateGroep(data: { groepId: string; name: string; description: string; memberUids: string[] }): Promise<{ success: boolean }> {
    return call<typeof data, { success: boolean }>('updateGroep', data);
  }

  deleteGroep(groepId: string): Promise<{ success: boolean }> {
    return call<{ groepId: string }, { success: boolean }>('deleteGroep', { groepId });
  }
}
