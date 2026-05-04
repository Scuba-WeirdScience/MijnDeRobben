import { Injectable, inject, signal, computed, effect } from '@angular/core';
import { httpsCallable } from 'firebase/functions';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  onSnapshot,
  doc,
  getDoc,
  QueryDocumentSnapshot,
  DocumentData,
  Timestamp,
} from 'firebase/firestore';
import { functions, firestore } from '@fire';
import { AuthService } from '../../core/auth/auth.service';
import { from, Observable } from 'rxjs';

// ── DTOs ────────────────────────────────────────────────────────────────────

export interface Groep {
  id: string;
  name: string;
  description: string;
  memberUids: string[];
  unreadCount: number;
}

export interface Thread {
  id: string;
  groepId: string;
  title: string;
  authorUid: string;
  authorName: string;
  pinnedAt: any | null;
  createdAt: any;
  updatedAt: any;
  lastMessageAt: any | null;
  lastMessageBody: string;
  messageCount: number;
  unreadPerUser: { [uid: string]: number };
}

export interface Message {
  id: string;
  threadId: string;
  groepId: string;
  authorUid: string;
  authorName: string;
  body: string;
  status: 'concept' | 'gepubliceerd';
  pinnedAt: any | null;
  deletedAt: any | null;
  replyToId: string | null;
  createdAt: any;
  updatedAt: any;
}

// ── Legacy types (kept for backwards compat with berichten-list.component) ──

export interface BerichtRaw {
  id: string;
  onderwerp: string;
  inhoud: string;
  inhoudPreview?: string;
  isPinned: boolean;
  zenderId: string;
  zenderNaam: string;
  zenderAvatarUrl: string | null;
  aangemaaktOp: string;
  bijgewerktOp: string | null;
  isGelezen: boolean;
  aantalLezingen: number;
}

export interface BerichtDetail extends BerichtRaw {
  inhoudPreview: string;
  zender: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
  };
}

export type BerichtSummary = BerichtDetail;

export interface CreateBerichtRequest {
  onderwerp: string;
  inhoud: string;
  isPinned: boolean;
}

/** @deprecated Alias for Message — kept for backwards compat with existing components */
export type Bericht = Message;

// ── Service ─────────────────────────────────────────────────────────────────

const PAGE_SIZE = 50;

@Injectable({ providedIn: 'root' })
export class BerichtenService {
  private readonly auth = inject(AuthService);

  // ── Unread counts ──────────────────────────────────────────────────────────
  readonly unreadCount = signal<number>(0);
  readonly unreadPerGroep = signal<Record<string, number>>({});

  // ── Groepen ────────────────────────────────────────────────────────────────
  readonly groepen = signal<Groep[]>([]);
  readonly allGroepen = signal<Groep[]>([]);
  readonly loadingGroepen = signal<boolean>(false);

  readonly activeGroepId = signal<string | null>(null);
  readonly activeGroep = computed(() =>
    this.groepen().find(g => g.id === this.activeGroepId()) ?? null
  );

  // ── Threads ────────────────────────────────────────────────────────────────
  readonly threads = signal<Thread[]>([]);
  readonly loadingThreads = signal<boolean>(false);

  readonly activeThreadId = signal<string | null>(null);
  readonly activeThread = computed(() =>
    this.threads().find(t => t.id === this.activeThreadId()) ?? null
  );

  // ── Messages ───────────────────────────────────────────────────────────────
  readonly messages = signal<Message[]>([]);
  readonly loadingMessages = signal<boolean>(false);
  readonly hasMoreMessages = signal<boolean>(false);

  readonly conceptMessages = signal<Message[]>([]);
  readonly readMessageIds = signal<Set<string>>(new Set());

  // ── Backward-compat aliases (used by existing components) ─────────────────
  /** @deprecated use messages */
  readonly berichten = this.messages;
  /** @deprecated use conceptMessages */
  readonly concepten = this.conceptMessages;
  /** @deprecated use readMessageIds */
  readonly readBerichtIds = this.readMessageIds;
  /** @deprecated use loadingMessages */
  readonly loadingBerichten = this.loadingMessages;
  /** @deprecated use hasMoreMessages */
  readonly hasMoreBerichten = this.hasMoreMessages;

  // ── Internal ───────────────────────────────────────────────────────────────
  private unsubUserDoc: (() => void) | null = null;
  private unsubGroepen: (() => void) | null = null;
  private unsubAllGroepen: (() => void) | null = null;
  private unsubThreads: (() => void) | null = null;
  private unsubMessages: (() => void) | null = null;
  private unsubConceptMessages: (() => void) | null = null;
  private lastMessageDoc: QueryDocumentSnapshot<DocumentData> | null = null;

  constructor() {
    // Auth state — set up user doc + groepen listeners
    effect(() => {
      const user = this.auth.currentUser();

      this.unsubUserDoc?.();
      this.unsubGroepen?.();
      this.unsubAllGroepen?.();
      this.unsubUserDoc = null;
      this.unsubGroepen = null;
      this.unsubAllGroepen = null;

      if (!user) {
        this.unreadCount.set(0);
        this.unreadPerGroep.set({});
        this.groepen.set([]);
        this.activeGroepId.set(null);
        this.threads.set([]);
        this.messages.set([]);
        this.conceptMessages.set([]);
        this.readMessageIds.set(new Set());
        return;
      }

      const uid = user.uid;

      // users/{uid} — unread counts
      this.unsubUserDoc = onSnapshot(doc(firestore, 'users', uid), (snap) => {
        const data = snap.data() as { unreadCount?: number; unreadPerGroep?: Record<string, number> } | undefined;
        this.unreadCount.set(data?.unreadCount ?? 0);
        this.unreadPerGroep.set(data?.unreadPerGroep ?? {});
      });

      // groepen where memberUids array-contains uid
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

      // All groepen (for admin beheer panel — no memberUids filter)
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

    // Threads listener — reacts to activeGroepId changes
    effect(() => {
      const groepId = this.activeGroepId();

      this.unsubThreads?.();
      this.unsubThreads = null;
      this.threads.set([]);

      if (!groepId) return;

      this.loadingThreads.set(true);
      const threadsQ = query(
        collection(firestore, 'groepen', groepId, 'threads')
      );

      this.unsubThreads = onSnapshot(threadsQ, (snap) => {
        const all: Thread[] = snap.docs.map(d => this.mapThread(d, groepId));

        // Sort: pinned first (desc pinnedAt), then by lastMessageAt desc (nulls last)
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
    });

    // Messages + concept messages listeners — reacts to activeThreadId changes
    effect(() => {
      const threadId = this.activeThreadId();
      const user = this.auth.currentUser();

      this.unsubMessages?.();
      this.unsubConceptMessages?.();
      this.unsubMessages = null;
      this.unsubConceptMessages = null;
      this.messages.set([]);
      this.conceptMessages.set([]);
      this.readMessageIds.set(new Set());
      this.lastMessageDoc = null;
      this.hasMoreMessages.set(false);

      if (!threadId || !user) return;

      const uid = user.uid;

      // Published messages
      this.loadingMessages.set(true);
      const messagesQ = query(
        collection(firestore, 'messages'),
        where('threadId', '==', threadId),
        where('status', '==', 'gepubliceerd'),
        orderBy('createdAt', 'asc'),
        limit(PAGE_SIZE)
      );
      this.unsubMessages = onSnapshot(messagesQ, (snap) => {
        if (!snap.empty) {
          this.lastMessageDoc = snap.docs[snap.docs.length - 1];
        }
        this.hasMoreMessages.set(snap.docs.length === PAGE_SIZE);
        const msgs = snap.docs.map(d => this.mapMessage(d));
        this.messages.set(msgs);
        this.loadingMessages.set(false);
        this.loadLezingen(uid, msgs.map(m => m.id));
      });

      // Concept messages for current user
      const conceptsQ = query(
        collection(firestore, 'messages'),
        where('authorUid', '==', uid),
        where('threadId', '==', threadId),
        where('status', '==', 'concept'),
        orderBy('createdAt', 'desc')
      );
      this.unsubConceptMessages = onSnapshot(conceptsQ, (snap) => {
        this.conceptMessages.set(snap.docs.map(d => this.mapMessage(d)));
      });
    });

    // Refresh token once on init
    this.auth.refreshUser();

    // Drive browser badge
    effect(() => {
      const count = this.unreadCount();
      if ('setAppBadge' in navigator) {
        if (count > 0) {
          (navigator as unknown as { setAppBadge: (n: number) => void }).setAppBadge(count);
        } else {
          (navigator as unknown as { clearAppBadge: () => void }).clearAppBadge();
        }
      }
    });
  }

  // ── Navigation helpers ─────────────────────────────────────────────────────

  selectGroep(groepId: string): void {
    this.activeGroepId.set(groepId);
    this.activeThreadId.set(null);
    this.messages.set([]);
    this.threads.set([]);
  }

  selectThread(threadId: string): void {
    this.activeThreadId.set(threadId);
    this.messages.set([]);
    this.readMessageIds.set(new Set());
  }

  // ── Pagination ─────────────────────────────────────────────────────────────

  loadMoreMessages(): void {
    const threadId = this.activeThreadId();
    if (!threadId || !this.lastMessageDoc) return;

    const q = query(
      collection(firestore, 'messages'),
      where('threadId', '==', threadId),
      where('status', '==', 'gepubliceerd'),
      orderBy('createdAt', 'asc'),
      limit(PAGE_SIZE),
      startAfter(this.lastMessageDoc)
    );

    onSnapshot(q, { includeMetadataChanges: false }, (snap) => {
      if (!snap.empty) {
        this.lastMessageDoc = snap.docs[snap.docs.length - 1];
      }
      this.hasMoreMessages.set(snap.docs.length === PAGE_SIZE);
      const newer = snap.docs.map(d => this.mapMessage(d));
      this.messages.update(current => [...current, ...newer]);
      const uid = this.auth.currentUser()?.uid;
      if (uid) {
        this.loadLezingen(uid, this.messages().map(m => m.id));
      }
    });
  }

  // ── Mappers ────────────────────────────────────────────────────────────────

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
    };
  }

  private mapMessage(d: QueryDocumentSnapshot<DocumentData>): Message {
    const data = d.data();
    return {
      id: d.id,
      threadId: data['threadId'] ?? '',
      groepId: data['groepId'] ?? '',
      authorUid: data['authorUid'] ?? '',
      authorName: data['authorName'] ?? '',
      body: data['body'] ?? '',
      status: data['status'] ?? 'gepubliceerd',
      pinnedAt: data['pinnedAt'] ?? null,
      deletedAt: data['deletedAt'] ?? null,
      replyToId: data['replyToId'] ?? null,
      createdAt: data['createdAt'],
      updatedAt: data['updatedAt'],
    };
  }

  private async loadLezingen(uid: string, messageIds: string[]): Promise<void> {
    const readIds = new Set<string>();
    await Promise.all(
      messageIds.map(async (id) => {
        const snap = await getDoc(doc(firestore, 'messages', id, 'lezingen', uid));
        if (snap.exists()) readIds.add(id);
      })
    );
    this.readMessageIds.set(readIds);
  }

  // ── Cloud Function wrappers — threads ──────────────────────────────────────

  createThread(groepId: string, title: string, body: string): Promise<{ threadId: string }> {
    const fn = httpsCallable<{ groepId: string; title: string; body: string }, { threadId: string }>(functions, 'createThread');
    return fn({ groepId, title, body }).then(r => r.data);
  }

  pinThread(threadId: string, groepId: string): Promise<{ success: boolean }> {
    const fn = httpsCallable<{ threadId: string; groepId: string }, { success: boolean }>(functions, 'pinThread');
    return fn({ threadId, groepId }).then(r => r.data);
  }

  // ── Cloud Function wrappers — messages ────────────────────────────────────

  sendMessage(threadId: string, groepId: string, body: string, replyToId?: string | null): Promise<{ messageId: string }> {
    const fn = httpsCallable<{ threadId: string; groepId: string; body: string; replyToId?: string | null }, { messageId: string }>(functions, 'sendMessage');
    return fn({ threadId, groepId, body, replyToId: replyToId ?? null }).then(r => r.data);
  }

  saveMessageConcept(threadId: string, groepId: string, body: string, messageId?: string): Promise<{ messageId: string }> {
    const fn = httpsCallable<{ threadId: string; groepId: string; body: string; messageId?: string }, { messageId: string }>(functions, 'saveMessageConcept');
    return fn({ threadId, groepId, body, messageId }).then(r => r.data);
  }

  publishMessageConcept(messageId: string): Promise<{ success: boolean }> {
    const fn = httpsCallable<{ messageId: string }, { success: boolean }>(functions, 'publishMessageConcept');
    return fn({ messageId }).then(r => r.data);
  }

  deleteMessageConcept(messageId: string): Promise<{ success: boolean }> {
    const fn = httpsCallable<{ messageId: string }, { success: boolean }>(functions, 'deleteMessageConcept');
    return fn({ messageId }).then(r => r.data);
  }

  pinMessage(messageId: string): Promise<{ success: boolean }> {
    const fn = httpsCallable<{ messageId: string }, { success: boolean }>(functions, 'pinMessage');
    return fn({ messageId }).then(r => r.data);
  }

  deleteMessage(messageId: string): Promise<{ success: boolean }> {
    const fn = httpsCallable<{ messageId: string }, { success: boolean }>(functions, 'deleteMessage');
    return fn({ messageId }).then(r => r.data);
  }

  deleteThread(threadId: string, groepId: string): Promise<{ success: boolean }> {
    const fn = httpsCallable<{ threadId: string; groepId: string }, { success: boolean }>(functions, 'deleteThread');
    return fn({ threadId, groepId }).then(r => r.data);
  }

  markMessageRead(messageId: string, threadId: string, groepId: string): Promise<{ success: boolean }> {
    const fn = httpsCallable<{ messageId: string; threadId: string; groepId: string }, { success: boolean }>(functions, 'markMessageRead');
    return fn({ messageId, threadId, groepId }).then(r => r.data);
  }

  markMessageUnread(messageId: string, threadId: string, groepId: string): Promise<{ success: boolean }> {
    const fn = httpsCallable<{ messageId: string; threadId: string; groepId: string }, { success: boolean }>(functions, 'markMessageUnread');
    return fn({ messageId, threadId, groepId }).then(r => r.data);
  }

  // ── Cloud Function wrappers — groepen ─────────────────────────────────────

  createGroep(data: { name: string; description: string; memberUids: string[] }): Promise<{ id: string }> {
    const fn = httpsCallable<typeof data, { id: string }>(functions, 'createGroep');
    return fn(data).then(r => r.data);
  }

  updateGroep(data: { groepId: string; name: string; description: string; memberUids: string[] }): Promise<{ success: boolean }> {
    const fn = httpsCallable<typeof data, { success: boolean }>(functions, 'updateGroep');
    return fn(data).then(r => r.data);
  }

  deleteGroep(groepId: string): Promise<{ success: boolean }> {
    const fn = httpsCallable<{ groepId: string }, { success: boolean }>(functions, 'deleteGroep');
    return fn({ groepId }).then(r => r.data);
  }

  // ── Legacy methods (kept for berichten-list.component) ────────────────────

  /** @deprecated use loadMoreMessages */
  loadMoreBerichten(): void { this.loadMoreMessages(); }

  /** @deprecated use sendMessage */
  sendBericht(groepId: string, body: string): Promise<{ id: string }> {
    const fn = httpsCallable<{ groepId: string; body: string }, { id: string }>(functions, 'sendBericht');
    return fn({ groepId, body }).then(r => r.data);
  }

  /** @deprecated */
  saveConcept(data: { berichtId?: string; groepId?: string; body: string }): Promise<{ id: string }> {
    const fn = httpsCallable<typeof data, { id: string }>(functions, 'saveConcept');
    return fn(data).then(r => r.data);
  }

  /** @deprecated */
  publishConcept(berichtId: string, groepId: string): Promise<{ success: boolean }> {
    const fn = httpsCallable<{ berichtId: string; groepId: string }, { success: boolean }>(functions, 'publishConcept');
    return fn({ berichtId, groepId }).then(r => r.data);
  }

  /** @deprecated */
  deleteConcept(berichtId: string): Promise<{ success: boolean }> {
    const fn = httpsCallable<{ berichtId: string }, { success: boolean }>(functions, 'deleteConcept');
    return fn({ berichtId }).then(r => r.data);
  }

  /** @deprecated */
  addReply(berichtId: string, body: string): Promise<{ id: string }> {
    const fn = httpsCallable<{ berichtId: string; body: string }, { id: string }>(functions, 'addReply');
    return fn({ berichtId, body }).then(r => r.data);
  }

  /** @deprecated */
  pinBericht(berichtId: string, pin: boolean): Promise<{ success: boolean }> {
    const fn = httpsCallable<{ berichtId: string; pin: boolean }, { success: boolean }>(functions, 'pinBericht');
    return fn({ berichtId, pin }).then(r => r.data);
  }

  /** @deprecated */
  markRead(berichtId: string, groepId: string): Promise<{ success: boolean }> {
    const fn = httpsCallable<{ berichtId: string; groepId: string }, { success: boolean }>(functions, 'markRead');
    return fn({ berichtId, groepId }).then(r => r.data);
  }

  /** @deprecated */
  markUnread(berichtId: string, groepId: string): Promise<{ success: boolean }> {
    const fn = httpsCallable<{ berichtId: string; groepId: string }, { success: boolean }>(functions, 'markUnread');
    return fn({ berichtId, groepId }).then(r => r.data);
  }

  /** @deprecated */
  deleteNieuwBericht(berichtId: string): Promise<{ success: boolean }> {
    const fn = httpsCallable<{ berichtId: string }, { success: boolean }>(functions, 'deleteNieuwBericht');
    return fn({ berichtId }).then(r => r.data);
  }

  getAll(): Observable<BerichtDetail[]> {
    const fn = httpsCallable<void, BerichtRaw[]>(functions, 'getBerichten');
    return from(fn().then(r => r.data.map(raw => this.enrich(raw))));
  }

  getById(id: string): Observable<BerichtDetail> {
    const fn = httpsCallable<{ id: string }, BerichtRaw>(functions, 'getBericht');
    return from(fn({ id }).then(r => this.enrich(r.data)));
  }

  create(dto: CreateBerichtRequest): Observable<BerichtDetail> {
    const fn = httpsCallable<CreateBerichtRequest, BerichtRaw>(functions, 'createBericht');
    return from(fn(dto).then(r => this.enrich(r.data)));
  }

  delete(id: string): Observable<{ success: boolean }> {
    const fn = httpsCallable<{ id: string }, { success: boolean }>(functions, 'deleteBericht');
    return from(fn({ id }).then(r => r.data));
  }

  markeerGelezen(id: string): Observable<{ success: boolean }> {
    const fn = httpsCallable<{ id: string }, { success: boolean }>(functions, 'markeerGelezen');
    return from(fn({ id }).then(r => r.data));
  }

  markeerOngelezen(id: string): Observable<{ success: boolean }> {
    const fn = httpsCallable<{ id: string }, { success: boolean }>(functions, 'markeerOngelezen');
    return from(fn({ id }).then(r => r.data));
  }

  getBerichtenVoorLid(memberId: string): Observable<BerichtDetail[]> {
    const fn = httpsCallable<{ memberId: string }, BerichtRaw[]>(functions, 'getBerichtenVoorLid');
    return from(fn({ memberId }).then(r => r.data.map(raw => this.enrich(raw))));
  }

  private enrich(raw: BerichtRaw): BerichtDetail {
    const parts = raw.zenderNaam.split(' ');
    const firstName = parts[0] ?? '';
    const lastName = parts.slice(1).join(' ');
    const stripped = raw.inhoud.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    const inhoudPreview = stripped.length > 150 ? stripped.substring(0, 150) + '…' : stripped;
    return {
      ...raw,
      inhoudPreview,
      zender: {
        id: raw.zenderId,
        firstName,
        lastName,
        avatarUrl: raw.zenderAvatarUrl,
      },
    };
  }
}
