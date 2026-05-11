import { Injectable, inject, signal, computed, effect } from '@angular/core';
import { collection, query, where, orderBy, onSnapshot, QueryDocumentSnapshot, DocumentData, Timestamp } from 'firebase/firestore';
import { firestore } from '@fire';
import { AuthService } from '../../../core/auth/auth.service';
import { GroepenService } from './groepen.service';
import { call } from '../../../core/firebase/callable';
import { ThreadDoc, ThreadConceptDoc } from '../../../core/models/firestore-types';

export type Thread = ThreadDoc;
export type ThreadConcept = ThreadConceptDoc;

@Injectable({ providedIn: 'root' })
export class ThreadsService {
  private readonly auth = inject(AuthService);
  private readonly groepenService = inject(GroepenService);

  readonly threads = signal<Thread[]>([]);
  readonly loadingThreads = signal<boolean>(false);

  readonly activeThreadId = signal<string | null>(null);
  readonly activeThread = computed(() =>
    this.threads().find(t => t.id === this.activeThreadId()) ?? null
  );

  readonly threadConcepten = signal<ThreadConcept[]>([]);
  readonly allThreadConcepten = signal<ThreadConcept[]>([]);

  private unsubThreads: (() => void) | null = null;
  private unsubThreadConcepten: (() => void) | null = null;
  private unsubAllThreadConcepten: (() => void) | null = null;
  private currentUid: string | null = null;

  constructor() {
    effect(() => {
      const user = this.auth.currentUser();

      this.unsubAllThreadConcepten?.();
      this.unsubAllThreadConcepten = null;
      this.allThreadConcepten.set([]);

      if (!user) {
        this.currentUid = null;
        return;
      }

      this.currentUid = user.uid;

      const q = query(
        collection(firestore, 'threadConcepten'),
        where('authorUid', '==', user.uid)
      );
      this.unsubAllThreadConcepten = onSnapshot(q, (snap) => {
        this.allThreadConcepten.set(snap.docs.map(d => this.mapThreadConcept(d)));
      });
    });

    effect(() => {
      const groepId = this.groepenService.activeGroepId();

      this.unsubThreads?.();
      this.unsubThreadConcepten?.();
      this.unsubThreads = null;
      this.unsubThreadConcepten = null;
      this.threads.set([]);
      this.threadConcepten.set([]);

      if (!groepId) return;

      this.loadingThreads.set(true);
      const threadsQ = query(
        collection(firestore, 'groepen', groepId, 'threads')
      );

      this.unsubThreads = onSnapshot(threadsQ, (snap) => {
        const all: Thread[] = snap.docs.map(d => this.mapThread(d, groepId));

        const pinned = all
          .filter(t => t.pinnedAt != null)
          .sort((a, b) => {
            const aMs = (a.pinnedAt as Timestamp)?.toMillis?.() ?? 0;
            const bMs = (b.pinnedAt as Timestamp)?.toMillis?.() ?? 0;
            return bMs - aMs;
          });
        const unpinned = all
          .filter(t => t.pinnedAt == null)
          .sort((a, b) => {
            const aMs = (a.lastMessageAt as Timestamp)?.toMillis?.() ?? 0;
            const bMs = (b.lastMessageAt as Timestamp)?.toMillis?.() ?? 0;
            return bMs - aMs;
          });

        this.threads.set([...pinned, ...unpinned]);
        this.loadingThreads.set(false);
      });

      const uid = this.currentUid;
      if (uid) {
        const conceptenQ = query(
          collection(firestore, 'threadConcepten'),
          where('groepId', '==', groepId),
          where('authorUid', '==', uid),
          orderBy('updatedAt', 'desc')
        );
        this.unsubThreadConcepten = onSnapshot(conceptenQ, (snap) => {
          this.threadConcepten.set(snap.docs.map(d => this.mapThreadConcept(d)));
        });
      }
    });
  }

  selectThread(threadId: string): void {
    this.activeThreadId.set(threadId);
  }

  createThread(groepId: string, title: string, body: string): Promise<{ threadId: string }> {
    return call<{ groepId: string; title: string; body: string }, { threadId: string }>('createThread', { groepId, title, body });
  }

  pinThread(threadId: string, groepId: string): Promise<{ success: boolean }> {
    return call<{ threadId: string; groepId: string }, { success: boolean }>('pinThread', { threadId, groepId });
  }

  deleteThread(threadId: string, groepId: string): Promise<{ success: boolean }> {
    return call<{ threadId: string; groepId: string }, { success: boolean }>('deleteThread', { threadId, groepId });
  }

  saveThreadConcept(groepId: string, title: string, body: string, conceptId?: string): Promise<{ conceptId: string }> {
    return call<{ groepId: string; title: string; body: string; conceptId?: string }, { conceptId: string }>('saveThreadConcept', { groepId, title, body, conceptId });
  }

  publishThreadConcept(conceptId: string): Promise<{ threadId: string }> {
    return call<{ conceptId: string }, { threadId: string }>('publishThreadConcept', { conceptId });
  }

  deleteThreadConcept(conceptId: string): Promise<{ success: boolean }> {
    return call<{ conceptId: string }, { success: boolean }>('deleteThreadConcept', { conceptId });
  }

  private stripHtml(html: string): string {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent ?? div.innerText ?? '';
  }

  private mapThread(d: QueryDocumentSnapshot<DocumentData>, groepId: string): Thread {
    const data = d.data();
    return {
      id: d.id,
      groepId,
      title: data['title'] ?? '',
      authorUid: data['authorUid'] ?? '',
      authorName: data['authorName'] ?? '',
      pinnedAt: data['pinnedAt'] ?? null,
      createdAt: data['createdAt'],
      updatedAt: data['updatedAt'],
      lastMessageAt: data['lastMessageAt'] ?? null,
      lastMessageBody: this.stripHtml(data['lastMessageBody'] ?? ''),
      messageCount: data['messageCount'] ?? 0,
      unreadPerUser: data['unreadPerUser'] ?? {},
      threadSeenCount: data['threadSeenCount'] ?? 0,
      threadSeenByUids: data['threadSeenByUids'] ?? [],
    };
  }

  private mapThreadConcept(d: QueryDocumentSnapshot<DocumentData>): ThreadConcept {
    const data = d.data();
    return {
      id: d.id,
      groepId: data['groepId'] ?? '',
      authorUid: data['authorUid'] ?? '',
      authorName: data['authorName'] ?? '',
      title: data['title'] ?? '',
      body: data['body'] ?? '',
      createdAt: data['createdAt'],
      updatedAt: data['updatedAt'],
    };
  }
}
