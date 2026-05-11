import { Injectable, inject } from '@angular/core';
import { from, Observable } from 'rxjs';
import { call } from '../../core/firebase/callable';
import { GroepenService, Groep } from './services/groepen.service';
import { ThreadsService, Thread, ThreadConcept } from './services/threads.service';
import { MessagesService, Message, ThreadLezingInfo, ThreadLezingenResult } from './services/messages.service';
import { BerichtenNavigationService } from './services/navigation.service';

export type { Groep, Thread, ThreadConcept, Message, ThreadLezingInfo, ThreadLezingenResult };

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

@Injectable({ providedIn: 'root' })
export class BerichtenService {
  private readonly _groepen = inject(GroepenService);
  private readonly _threads = inject(ThreadsService);
  private readonly _messages = inject(MessagesService);
  private readonly _navigation = inject(BerichtenNavigationService);

  // ── Unread counts — delegated ────────────────────────────────────────────
  readonly unreadCount = this._groepen.unreadCount;
  readonly unreadPerGroep = this._groepen.unreadPerGroep;
  readonly groepen = this._groepen.groepen;
  readonly allGroepen = this._groepen.allGroepen;
  readonly loadingGroepen = this._groepen.loadingGroepen;
  readonly activeGroepId = this._groepen.activeGroepId;
  readonly activeGroep = this._groepen.activeGroep;

  // ── Threads — delegated ──────────────────────────────────────────────────
  readonly threads = this._threads.threads;
  readonly loadingThreads = this._threads.loadingThreads;
  readonly activeThreadId = this._threads.activeThreadId;
  readonly activeThread = this._threads.activeThread;
  readonly threadConcepten = this._threads.threadConcepten;
  readonly allThreadConcepten = this._threads.allThreadConcepten;

  // ── Messages — delegated ─────────────────────────────────────────────────
  readonly messages = this._messages.messages;
  readonly loadingMessages = this._messages.loadingMessages;
  readonly hasMoreMessages = this._messages.hasMoreMessages;
  readonly conceptMessages = this._messages.conceptMessages;
  readonly readMessageIds = this._messages.readMessageIds;
  readonly messageReaderCounts = this._messages.messageReaderCounts;
  readonly allMessageConcepten = this._messages.allMessageConcepten;
  readonly pendingConceptEdit = this._messages.pendingConceptEdit;

  // ── Backward-compat aliases ─────────────────────────────────────────────
  /** @deprecated use messages */
  readonly berichten = this._messages.messages;
  /** @deprecated use conceptMessages */
  readonly concepten = this._messages.conceptMessages;
  /** @deprecated use readMessageIds */
  readonly readBerichtIds = this._messages.readMessageIds;
  /** @deprecated use loadingMessages */
  readonly loadingBerichten = this._messages.loadingMessages;
  /** @deprecated use hasMoreMessages */
  readonly hasMoreBerichten = this._messages.hasMoreMessages;

  // ── Navigation — delegated ──────────────────────────────────────────────
  selectGroep(groepId: string): void { this._navigation.selectGroep(groepId); }
  selectGroepAndThread(groepId: string, threadId: string): void { this._navigation.selectGroepAndThread(groepId, threadId); }
  selectThread(threadId: string): void { this._navigation.selectThread(threadId); }

  // ── Pagination ──────────────────────────────────────────────────────────
  loadMoreMessages(): void { this._messages.loadMoreMessages(); }

  // ── Thread CRUD ─────────────────────────────────────────────────────────
  createThread(groepId: string, title: string, body: string): Promise<{ threadId: string }> {
    return this._threads.createThread(groepId, title, body);
  }
  pinThread(threadId: string, groepId: string): Promise<{ success: boolean }> {
    return this._threads.pinThread(threadId, groepId);
  }
  deleteThread(threadId: string, groepId: string): Promise<{ success: boolean }> {
    return this._threads.deleteThread(threadId, groepId);
  }

  // ── Message CRUD ────────────────────────────────────────────────────────
  sendMessage(threadId: string, groepId: string, body: string, replyToId?: string | null): Promise<{ messageId: string }> {
    return this._messages.sendMessage(threadId, groepId, body, replyToId);
  }
  saveMessageConcept(threadId: string, groepId: string, body: string, messageId?: string): Promise<{ messageId: string }> {
    return this._messages.saveMessageConcept(threadId, groepId, body, messageId);
  }
  publishMessageConcept(messageId: string): Promise<{ success: boolean }> {
    return this._messages.publishMessageConcept(messageId);
  }
  deleteMessageConcept(messageId: string): Promise<{ success: boolean }> {
    return this._messages.deleteMessageConcept(messageId);
  }
  pinMessage(messageId: string): Promise<{ success: boolean }> {
    return this._messages.pinMessage(messageId);
  }
  deleteMessage(messageId: string): Promise<{ success: boolean }> {
    return this._messages.deleteMessage(messageId);
  }
  markMessageRead(messageId: string, threadId: string, groepId: string): Promise<{ success: boolean }> {
    return this._messages.markMessageRead(messageId, threadId, groepId);
  }
  markMessageUnread(messageId: string, threadId: string, groepId: string): Promise<{ success: boolean }> {
    return this._messages.markMessageUnread(messageId, threadId, groepId);
  }
  getThreadLezingen(threadId: string, groepId: string): Promise<ThreadLezingenResult> {
    return this._messages.getThreadLezingen(threadId, groepId);
  }

  // ── Thread concept CRUD ─────────────────────────────────────────────────
  saveThreadConcept(groepId: string, title: string, body: string, conceptId?: string): Promise<{ conceptId: string }> {
    return this._threads.saveThreadConcept(groepId, title, body, conceptId);
  }
  publishThreadConcept(conceptId: string): Promise<{ threadId: string }> {
    return this._threads.publishThreadConcept(conceptId);
  }
  deleteThreadConcept(conceptId: string): Promise<{ success: boolean }> {
    return this._threads.deleteThreadConcept(conceptId);
  }

  // ── Groep CRUD ──────────────────────────────────────────────────────────
  createGroep(data: { name: string; description: string; memberUids: string[] }): Promise<{ id: string }> {
    return this._groepen.createGroep(data);
  }
  updateGroep(data: { groepId: string; name: string; description: string; memberUids: string[] }): Promise<{ success: boolean }> {
    return this._groepen.updateGroep(data);
  }
  deleteGroep(groepId: string): Promise<{ success: boolean }> {
    return this._groepen.deleteGroep(groepId);
  }

  // ── Legacy methods (kept for berichten-list.component) ────────────────────

  /** @deprecated use loadMoreMessages */
  loadMoreBerichten(): void { this._messages.loadMoreMessages(); }

  /** @deprecated use sendMessage */
  sendBericht(groepId: string, body: string): Promise<{ id: string }> {
    return call<{ groepId: string; body: string }, { id: string }>('sendBericht', { groepId, body });
  }

  /** @deprecated */
  saveConcept(data: { berichtId?: string; groepId?: string; body: string }): Promise<{ id: string }> {
    return call<typeof data, { id: string }>('saveConcept', data);
  }

  /** @deprecated */
  publishConcept(berichtId: string, groepId: string): Promise<{ success: boolean }> {
    return call<{ berichtId: string; groepId: string }, { success: boolean }>('publishConcept', { berichtId, groepId });
  }

  /** @deprecated */
  deleteConcept(berichtId: string): Promise<{ success: boolean }> {
    return call<{ berichtId: string }, { success: boolean }>('deleteConcept', { berichtId });
  }

  /** @deprecated */
  addReply(berichtId: string, body: string): Promise<{ id: string }> {
    return call<{ berichtId: string; body: string }, { id: string }>('addReply', { berichtId, body });
  }

  /** @deprecated */
  pinBericht(berichtId: string, pin: boolean): Promise<{ success: boolean }> {
    return call<{ berichtId: string; pin: boolean }, { success: boolean }>('pinBericht', { berichtId, pin });
  }

  /** @deprecated */
  markRead(berichtId: string, groepId: string): Promise<{ success: boolean }> {
    return call<{ berichtId: string; groepId: string }, { success: boolean }>('markRead', { berichtId, groepId });
  }

  /** @deprecated */
  markUnread(berichtId: string, groepId: string): Promise<{ success: boolean }> {
    return call<{ berichtId: string; groepId: string }, { success: boolean }>('markUnread', { berichtId, groepId });
  }

  /** @deprecated */
  deleteNieuwBericht(berichtId: string): Promise<{ success: boolean }> {
    return call<{ berichtId: string }, { success: boolean }>('deleteNieuwBericht', { berichtId });
  }

  getAll(): Observable<BerichtDetail[]> {
    return from(call<void, BerichtRaw[]>('getBerichten').then(list => list.map(raw => this.enrich(raw))));
  }

  getById(id: string): Observable<BerichtDetail> {
    return from(call<{ id: string }, BerichtRaw>('getBericht', { id }).then(raw => this.enrich(raw)));
  }

  create(dto: CreateBerichtRequest): Observable<BerichtDetail> {
    return from(call<CreateBerichtRequest, BerichtRaw>('createBericht', dto).then(raw => this.enrich(raw)));
  }

  delete(id: string): Observable<{ success: boolean }> {
    return from(call<{ id: string }, { success: boolean }>('deleteBericht', { id }));
  }

  markeerGelezen(id: string): Observable<{ success: boolean }> {
    return from(call<{ id: string }, { success: boolean }>('markeerGelezen', { id }));
  }

  markeerOngelezen(id: string): Observable<{ success: boolean }> {
    return from(call<{ id: string }, { success: boolean }>('markeerOngelezen', { id }));
  }

  getBerichtenVoorLid(memberId: string): Observable<BerichtDetail[]> {
    return from(call<{ memberId: string }, BerichtRaw[]>('getBerichtenVoorLid', { memberId }).then(list => list.map(raw => this.enrich(raw))));
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
