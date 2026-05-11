import { Injectable, inject, signal, effect } from '@angular/core';
import { collection, query, where, orderBy, limit, startAfter, onSnapshot, doc, getDoc, getDocs, QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { firestore } from '@fire';
import { AuthService } from '../../../core/auth/auth.service';
import { ThreadsService } from './threads.service';
import { call } from '../../../core/firebase/callable';
import { MessageDoc } from '../../../core/models/firestore-types';

export type Message = MessageDoc;

export interface ThreadLezingInfo {
  uid: string;
  displayName: string;
  avatarUrl: string | null;
  gezien: boolean;
}

export interface ThreadLezingenResult {
  lezingen: ThreadLezingInfo[];
  gezienCount: number;
  totalCount: number;
}

const PAGE_SIZE = 50;

@Injectable({ providedIn: 'root' })
export class MessagesService {
  private readonly auth = inject(AuthService);
  private readonly threadsService = inject(ThreadsService);

  readonly messages = signal<Message[]>([]);
  readonly loadingMessages = signal<boolean>(false);
  readonly hasMoreMessages = signal<boolean>(false);

  readonly conceptMessages = signal<Message[]>([]);
  readonly readMessageIds = signal<Set<string>>(new Set());
  readonly messageReaderCounts = signal<Record<string, number>>({});

  readonly allMessageConcepten = signal<Message[]>([]);
  readonly pendingConceptEdit = signal<Message | null>(null);

  private unsubMessages: (() => void) | null = null;
  private unsubConceptMessages: (() => void) | null = null;
  private unsubAllMessageConcepten: (() => void) | null = null;
  private lastMessageDoc: QueryDocumentSnapshot<DocumentData> | null = null;

  constructor() {
    effect(() => {
      const user = this.auth.currentUser();

      this.unsubAllMessageConcepten?.();
      this.unsubAllMessageConcepten = null;
      this.allMessageConcepten.set([]);

      if (!user) return;

      const q = query(
        collection(firestore, 'messages'),
        where('authorUid', '==', user.uid),
        where('status', '==', 'concept')
      );
      this.unsubAllMessageConcepten = onSnapshot(q, (snap) => {
        this.allMessageConcepten.set(snap.docs.map(d => this.mapMessage(d)));
      });
    });

    effect(() => {
      const threadId = this.threadsService.activeThreadId();
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
  }

  setPendingConceptEdit(message: Message | null): void {
    this.pendingConceptEdit.set(message);
  }

  loadMoreMessages(): void {
    const threadId = this.threadsService.activeThreadId();
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

  private async loadLezingen(uid: string, messageIds: string[]): Promise<void> {
    const readIds = new Set<string>();
    const counts: Record<string, number> = {};
    const currentMessages = this.messages();

    await Promise.all(
      messageIds.map(async (id) => {
        const snap = await getDoc(doc(firestore, 'messages', id, 'lezingen', uid));
        if (snap.exists()) readIds.add(id);

        const msg = currentMessages.find(m => m.id === id);
        if (msg?.authorUid === uid) {
          const lezingenSnap = await getDocs(
            collection(firestore, 'messages', id, 'lezingen')
          );
          counts[id] = lezingenSnap.size;
        }
      })
    );

    this.readMessageIds.set(readIds);
    this.messageReaderCounts.set(counts);
  }

  sendMessage(threadId: string, groepId: string, body: string, replyToId?: string | null): Promise<{ messageId: string }> {
    return call<{ threadId: string; groepId: string; body: string; replyToId?: string | null }, { messageId: string }>('sendMessage', { threadId, groepId, body, replyToId: replyToId ?? null });
  }

  saveMessageConcept(threadId: string, groepId: string, body: string, messageId?: string): Promise<{ messageId: string }> {
    return call<{ threadId: string; groepId: string; body: string; messageId?: string }, { messageId: string }>('saveMessageConcept', { threadId, groepId, body, messageId });
  }

  publishMessageConcept(messageId: string): Promise<{ success: boolean }> {
    return call<{ messageId: string }, { success: boolean }>('publishMessageConcept', { messageId });
  }

  deleteMessageConcept(messageId: string): Promise<{ success: boolean }> {
    return call<{ messageId: string }, { success: boolean }>('deleteMessageConcept', { messageId });
  }

  pinMessage(messageId: string): Promise<{ success: boolean }> {
    return call<{ messageId: string }, { success: boolean }>('pinMessage', { messageId });
  }

  deleteMessage(messageId: string): Promise<{ success: boolean }> {
    return call<{ messageId: string }, { success: boolean }>('deleteMessage', { messageId });
  }

  markMessageRead(messageId: string, threadId: string, groepId: string): Promise<{ success: boolean }> {
    return call<{ messageId: string; threadId: string; groepId: string }, { success: boolean }>('markMessageRead', { messageId, threadId, groepId });
  }

  markMessageUnread(messageId: string, threadId: string, groepId: string): Promise<{ success: boolean }> {
    return call<{ messageId: string; threadId: string; groepId: string }, { success: boolean }>('markMessageUnread', { messageId, threadId, groepId });
  }

  getThreadLezingen(threadId: string, groepId: string): Promise<ThreadLezingenResult> {
    return call<{ threadId: string; groepId: string }, ThreadLezingenResult>('getThreadLezingen', { threadId, groepId });
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
}
