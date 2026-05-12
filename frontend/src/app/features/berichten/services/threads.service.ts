import { Injectable, inject, signal, computed, effect } from '@angular/core';
import { collection, query, where, orderBy, onSnapshot, QueryDocumentSnapshot, DocumentData, Timestamp, getDocs } from 'firebase/firestore';
import { firestore } from '@fire';
import { AuthService } from '../../../core/auth/auth.service';
import { GroepenService } from './groepen.service';
import { call } from '../../../core/firebase/callable';
import { ThreadDoc, ThreadConceptDoc, ActiviteitDoc, ActiviteitRegistratieDoc } from '../../../core/models/firestore-types';
import { generateOccurrences } from '../../activiteiten/recurrence';

export type Thread = ThreadDoc;
export type ThreadConcept = ThreadConceptDoc;

/** The next upcoming occurrence for the linked activiteit (null if none / no activiteit). */
export interface UpcomingOccurrence {
  activiteitId: string;
  occurrenceDatum: string;   // yyyy-MM-dd
  startDatumTijd: string;
}

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

  /** Activiteit that is linked to the active thread (null if none). */
  readonly linkedActiviteit = signal<ActiviteitDoc | null>(null);

  /** Next upcoming occurrence for the linked activiteit (null if none). */
  readonly upcomingOccurrence = signal<UpcomingOccurrence | null>(null);

  /** Current user's registration for the upcoming occurrence (null = not registered, undefined = loading). */
  readonly mijnRegistratie = signal<ActiviteitRegistratieDoc | null | undefined>(undefined);

  /** All registrations for the upcoming occurrence (empty while loading or no occurrence). */
  readonly occurrenceRegistraties = signal<ActiviteitRegistratieDoc[]>([]);

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

    // Reactive lookup: find the activiteit linked to the active thread
    effect(() => {
      const threadId = this.activeThreadId();
      if (!threadId) {
        this.linkedActiviteit.set(null);
        this.upcomingOccurrence.set(null);
        this.mijnRegistratie.set(undefined);
        this.occurrenceRegistraties.set([]);
        return;
      }
      const q = query(
        collection(firestore, 'activiteiten'),
        where('threadId', '==', threadId)
      );
      getDocs(q).then(snap => {
        if (!snap.empty) {
          const d = snap.docs[0];
          const data = d.data();
          const act = { id: d.id, ...data } as ActiviteitDoc;
          this.linkedActiviteit.set(act);
          this._deriveUpcomingOccurrence(act);
        } else {
          this.linkedActiviteit.set(null);
          this.upcomingOccurrence.set(null);
          this.mijnRegistratie.set(undefined);
          this.occurrenceRegistraties.set([]);
        }
      }).catch(() => {
        this.linkedActiviteit.set(null);
        this.upcomingOccurrence.set(null);
        this.mijnRegistratie.set(undefined);
        this.occurrenceRegistraties.set([]);
      });
    });
  }

  selectThread(threadId: string): void {
    this.activeThreadId.set(threadId);
  }

  // ── Registratie helpers ──────────────────────────────────────────────────

  registreer(aantalGasten = 0, opmerking: string | null = null): Promise<ActiviteitRegistratieDoc> {
    const occ = this.upcomingOccurrence();
    if (!occ) return Promise.reject(new Error('Geen aankomende activiteit.'));
    return call<object, ActiviteitRegistratieDoc>('registreerVoorActiviteit', {
      activiteitId: occ.activiteitId,
      occurrenceDatum: occ.occurrenceDatum,
      aantalGasten,
      opmerking,
    }).then(reg => {
      this.mijnRegistratie.set(reg);
      return reg;
    });
  }

  meldAfwezig(): Promise<ActiviteitRegistratieDoc> {
    const occ = this.upcomingOccurrence();
    if (!occ) return Promise.reject(new Error('Geen aankomende activiteit.'));

    const existing = this.mijnRegistratie();

    const setAfwezig = (reg: ActiviteitRegistratieDoc) =>
      call<object, ActiviteitRegistratieDoc>('updateRegistratieStatus', {
        registratieId: reg.id,
        status: 'afwezig',
      }).then(updated => {
        this.mijnRegistratie.set(updated);
        return updated;
      });

    if (existing) {
      return setAfwezig(existing);
    }

    // No registration yet — create one (aangemeld) and immediately flip to afwezig
    return call<object, ActiviteitRegistratieDoc>('registreerVoorActiviteit', {
      activiteitId: occ.activiteitId,
      occurrenceDatum: occ.occurrenceDatum,
      aantalGasten: 0,
      opmerking: null,
    }).then(reg => setAfwezig(reg));
  }

  annuleerInschrijving(): Promise<{ success: boolean }> {
    const occ = this.upcomingOccurrence();
    if (!occ) return Promise.reject(new Error('Geen aankomende activiteit.'));
    return call<object, { success: boolean }>('annuleerRegistratie', {
      activiteitId: occ.activiteitId,
      occurrenceDatum: occ.occurrenceDatum,
    }).then(res => {
      this.mijnRegistratie.set(null);
      return res;
    });
  }

  resetInschrijvingen(): Promise<{ deleted: number }> {
    const occ = this.upcomingOccurrence();
    if (!occ) return Promise.reject(new Error('Geen aankomende activiteit.'));
    return call<object, { deleted: number }>('resetInschrijvingen', {
      activiteitId: occ.activiteitId,
      occurrenceDatum: occ.occurrenceDatum,
    }).then(res => {
      this.mijnRegistratie.set(null);
      this.occurrenceRegistraties.set([]);
      return res;
    });
  }

  private _deriveUpcomingOccurrence(act: ActiviteitDoc): void {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let occurrenceDatum: string;

    if (act.isHerhalend && act.recurrenceRule) {
      // Generate occurrences from today up to 1 year out, pick the first one
      const to = new Date(today.getFullYear() + 1, today.getMonth(), today.getDate());
      const occurrences = generateOccurrences([act], today, to, []);
      if (occurrences.length === 0) {
        this.upcomingOccurrence.set(null);
        this.mijnRegistratie.set(undefined);
        this.occurrenceRegistraties.set([]);
        return;
      }
      const first = occurrences[0];
      occurrenceDatum = first.occurrenceDatum;
    } else {
      occurrenceDatum = act.startDatumTijd.substring(0, 10);
    }

    this.upcomingOccurrence.set({
      activiteitId: act.id,
      occurrenceDatum,
      startDatumTijd: act.startDatumTijd,
    });

    this._loadRegistraties(act.id, occurrenceDatum);
  }

  private _loadRegistraties(activiteitId: string, occurrenceDatum: string): void {
    const uid = this.auth.currentUser()?.uid;
    this.mijnRegistratie.set(undefined);
    this.occurrenceRegistraties.set([]);

    call<object, ActiviteitRegistratieDoc[]>('getRegistratiesVoorOccurrence', {
      activiteitId,
      occurrenceDatum,
    }).then(list => {
      this.occurrenceRegistraties.set(list);
      const mine = uid ? (list.find(r => r.memberUid === uid) ?? null) : null;
      this.mijnRegistratie.set(mine);
    }).catch(() => {
      this.mijnRegistratie.set(null);
    });
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
