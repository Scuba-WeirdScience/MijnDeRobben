import { Component, computed, effect, ElementRef, inject, signal, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MessagesService } from '../../services/messages.service';
import { GroepenService } from '../../services/groepen.service';
import { ThreadsService } from '../../services/threads.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { ToastService } from '../../../../shared/components/toast/toast.service';
import { LucidePin, LucidePinOff, LucideTrash2, LucideMail, LucideMailOpen, LucideReply, LucideHash } from '../../../../shared/lucide-icons';
import { EmoticonPipe } from '../../../../shared/pipes/emoticon.pipe';
import { ThreadLezingenComponent } from '../thread-lezingen/thread-lezingen.component';

const _TW_SAFELIST = [
  'bg-scuba-600', 'bg-scuba-700', 'dark:bg-scuba-700', 'rounded-tr-none',
  'bg-gray-100', 'dark:bg-gray-800', 'rounded-tl-none',
  'text-scuba-500', 'hover:text-scuba-700', 'dark:hover:text-scuba-300',
  'text-gray-400', 'hover:text-gray-600', 'dark:hover:text-gray-200',
  'text-scuba-400', 'dark:text-scuba-300',
  'msg-highlight',
];

@Component({
  selector: 'app-message-list',
  templateUrl: './message-list.component.html',
  standalone: true,
  imports: [
    CommonModule,
    LucidePin,
    LucidePinOff,
    LucideTrash2,
    LucideMail,
    LucideMailOpen,
    LucideReply,
    LucideHash,
    EmoticonPipe,
    ThreadLezingenComponent,
  ],
})
export class MessageListComponent {
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

  constructor() {
    effect(() => {
      const msgs = this.messagesService.messages();
      if (msgs.length > 0) {
        setTimeout(() => {
          this.messagesEnd()?.nativeElement?.scrollIntoView({ behavior: 'smooth' });
        }, 50);
      }
    });
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

  async toggleRead(message: any): Promise<void> {
    const thread = this.threadsService.activeThread();
    const groepId = this.groepenService.activeGroepId();
    if (!thread || !groepId) return;
    try {
      if (this.isRead(message)) {
        await this.messagesService.markMessageUnread(message.id, thread.id, groepId);
        const s = new Set(this.messagesService.readMessageIds());
        s.delete(message.id);
        this.messagesService.readMessageIds.set(s);
      } else {
        await this.messagesService.markMessageRead(message.id, thread.id, groepId);
        const s = new Set(this.messagesService.readMessageIds());
        s.add(message.id);
        this.messagesService.readMessageIds.set(s);
      }
    } catch {
      this.toast.error('Status kon niet worden gewijzigd.');
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
