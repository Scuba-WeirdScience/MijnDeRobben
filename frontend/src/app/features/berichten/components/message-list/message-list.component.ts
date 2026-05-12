import { Component, computed, effect, ElementRef, inject, OnDestroy, signal, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MessagesService } from '../../services/messages.service';
import { GroepenService } from '../../services/groepen.service';
import { ThreadsService } from '../../services/threads.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { ToastService } from '../../../../shared/components/toast/toast.service';
import { LucidePin, LucidePinOff, LucideTrash2, LucideReply, LucideHash, LucideCalendar, LucideChevronRight } from '../../../../shared/lucide-icons';
import { EmoticonPipe } from '../../../../shared/pipes/emoticon.pipe';
import { ThreadLezingenComponent } from '../thread-lezingen/thread-lezingen.component';
import { ActiviteitThreadCardComponent } from '../activiteit-thread-card/activiteit-thread-card.component';

const _TW_SAFELIST = [
  'bg-scuba-600', 'bg-scuba-700', 'dark:bg-scuba-700', 'rounded-tr-none',
  'bg-gray-100', 'dark:bg-gray-800', 'rounded-tl-none',
  'text-scuba-400', 'dark:text-scuba-300',
  'msg-highlight',
];

@Component({
  selector: 'app-message-list',
  templateUrl: './message-list.component.html',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    LucidePin,
    LucidePinOff,
    LucideTrash2,
    LucideReply,
    LucideHash,
    LucideCalendar,
    LucideChevronRight,
    EmoticonPipe,
    ThreadLezingenComponent,
    ActiviteitThreadCardComponent,
  ],
})
export class MessageListComponent implements OnDestroy {
  protected readonly messagesService = inject(MessagesService);
  protected readonly groepenService = inject(GroepenService);
  protected readonly threadsService = inject(ThreadsService);
  protected readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  readonly messagesEnd = viewChild<ElementRef>('messagesEnd');

  readonly isAdmin = computed(() => this.auth.hasAnyRole(['Beheer', 'Bestuur']));
  readonly pinnedMessages = computed(() => this.messagesService.messages().filter(m => m.pinnedAt && !m.deletedAt));

  replyOpenId = signal<string | null>(null);
  replyBody = signal('');
  sendingReply = signal(false);
  deletingId = signal<string | null>(null);
  highlightedId = signal<string | null>(null);

  private readObserver: IntersectionObserver | null = null;
  private observedMessageIds = new Set<string>();

  constructor() {
    // Scroll to bottom when messages load
    effect(() => {
      const msgs = this.messagesService.messages();
      if (msgs.length > 0) {
        setTimeout(() => {
          this.messagesEnd()?.nativeElement?.scrollIntoView({ behavior: 'smooth' });
        }, 50);
      }
    });

    // Auto-read: reconnect observer whenever messages or thread changes
    effect(() => {
      const msgs = this.messagesService.messages();
      const threadId = this.threadsService.activeThreadId();
      const groepId = this.groepenService.activeGroepId();

      // Reset tracked ids when thread changes
      if (!threadId) {
        this._destroyObserver();
        return;
      }

      // Defer so the DOM is rendered before we query elements
      setTimeout(() => this._setupReadObserver(msgs, threadId, groepId), 100);
    });
  }

  ngOnDestroy(): void {
    this._destroyObserver();
  }

  private _destroyObserver(): void {
    this.readObserver?.disconnect();
    this.readObserver = null;
    this.observedMessageIds.clear();
  }

  private _setupReadObserver(msgs: any[], threadId: string, groepId: string | null): void {
    if (!groepId) return;

    // Create observer once (or reuse if already exists for this thread)
    if (!this.readObserver) {
      this.readObserver = new IntersectionObserver(
        (entries) => this._onIntersection(entries, threadId, groepId),
        { threshold: 0.5 }
      );
    }

    const uid = this.auth.currentUser()?.uid;
    if (!uid) return;

    // Observe every unread message element that isn't already being observed.
    // Own messages are skipped for per-message read tracking (you always "read"
    // your own messages), but we still need to register thread-level "seen".
    let hasUnreadFromOthers = false;
    for (const msg of msgs) {
      if (msg.deletedAt) continue;
      if (msg.authorUid === uid) continue;
      if (this.messagesService.readMessageIds().has(msg.id)) continue;
      if (this.observedMessageIds.has(msg.id)) continue;

      hasUnreadFromOthers = true;
      const el = document.getElementById('msg-' + msg.id);
      if (el) {
        this.readObserver.observe(el);
        this.observedMessageIds.add(msg.id);
      }
    }

    // If there are no unread messages from others (e.g. thread only contains
    // your own messages, or all are already read), the IntersectionObserver
    // will never fire — so threadSeenByUids would never be updated.
    // Fix: pick any message in the thread and call markMessageRead directly.
    // The backend is idempotent (skips the lezing write if it already exists)
    // but always updates threadSeenByUids.
    if (!hasUnreadFromOthers && msgs.length > 0) {
      const anyMsg = msgs.find(m => !m.deletedAt);
      if (anyMsg) {
        this.messagesService.markMessageRead(anyMsg.id, threadId, groepId).catch(() => {});
      }
    }
  }

  private _onIntersection(entries: IntersectionObserverEntry[], threadId: string, groepId: string): void {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;

      const el = entry.target as HTMLElement;
      const messageId = el.id.replace('msg-', '');
      if (!messageId) continue;

      // Stop observing this element — one-shot
      this.readObserver?.unobserve(el);
      this.observedMessageIds.delete(messageId);

      // Already marked read locally — skip
      if (this.messagesService.readMessageIds().has(messageId)) continue;

      // Optimistic local update
      const s = new Set(this.messagesService.readMessageIds());
      s.add(messageId);
      this.messagesService.readMessageIds.set(s);

      // Fire-and-forget cloud function call
      this.messagesService.markMessageRead(messageId, threadId, groepId).catch(() => {
        // Silently revert on failure
        const revert = new Set(this.messagesService.readMessageIds());
        revert.delete(messageId);
        this.messagesService.readMessageIds.set(revert);
      });
    }
  }

  isOwnMessage(message: any): boolean {
    return message.authorUid === this.auth.currentUser()?.uid;
  }

  getReaderCount(message: any): number {
    return this.messagesService.messageReaderCounts()[message.id] ?? 0;
  }

  canDelete(message: any): boolean {
    return this.isOwnMessage(message) || this.isAdmin();
  }

  isRead(message: any): boolean {
    return this.messagesService.readMessageIds().has(message.id);
  }

  getInitial(name: string): string {
    return name ? name.charAt(0).toUpperCase() : '?';
  }

  async togglePin(message: any): Promise<void> {
    try {
      await this.auth.refreshUser();
      await this.messagesService.pinMessage(message.id);
    } catch {
      this.toast.error('Vastpinnen mislukt.');
    }
  }

  async deleteMessage(message: any): Promise<void> {
    this.deletingId.set(message.id);
    try {
      await this.messagesService.deleteMessage(message.id);
      this.toast.success('Bericht verwijderd.');
    } catch {
      this.toast.error('Verwijderen mislukt.');
    } finally {
      this.deletingId.set(null);
    }
  }

  openReply(messageId: string): void {
    this.replyOpenId.set(messageId);
    this.replyBody.set('');
  }

  closeReply(): void {
    this.replyOpenId.set(null);
    this.replyBody.set('');
  }

  async submitReply(): Promise<void> {
    const threadId = this.threadsService.activeThreadId();
    const groepId = this.groepenService.activeGroepId();
    if (!threadId || !groepId || !this.replyBody().trim()) return;
    this.sendingReply.set(true);
    try {
      await this.messagesService.sendMessage(threadId, groepId, this.replyBody(), this.replyOpenId());
      this.closeReply();
    } catch {
      this.toast.error('Versturen mislukt.');
    } finally {
      this.sendingReply.set(false);
    }
  }

  getReplyParent(message: any): any | null {
    if (!message.replyToId) return null;
    return this.messagesService.messages().find(m => m.id === message.replyToId) ?? null;
  }

  scrollToMessage(messageId: string): void {
    const el = document.getElementById('msg-' + messageId);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    this.highlightedId.set(messageId);
    setTimeout(() => this.highlightedId.set(null), 1500);
  }
}
