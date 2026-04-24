import { Component, inject, signal, computed, effect, ElementRef, ViewChild } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { BerichtenService, Bericht } from '../../berichten.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { ToastService } from '../../../../shared/components/toast/toast.service';
import { SpinnerComponent, ButtonComponent, FormFieldComponent, InputComponent } from '../../../../shared/components/design-system';
import { LucidePin, LucideReply, LucideChevronDown, LucideTrash2, LucideMail, LucideMailOpen, LucideMessageSquare } from '../../../../shared/lucide-icons';

// Tailwind safelist — do NOT remove
const _TW_SAFELIST = [
  'bg-scuba-600', 'dark:bg-scuba-700', 'text-white',
  'bg-gray-100', 'dark:bg-gray-800',
  'justify-end', 'justify-start',
  'rounded-tl-none', 'rounded-tr-none',
  'bg-scuba-600/30', 'dark:bg-scuba-700/30',
  'text-gray-400', 'hover:text-gray-600', 'dark:hover:text-gray-200',
  'text-scuba-500', 'hover:text-scuba-700', 'dark:hover:text-scuba-300',
];

@Component({
  selector: 'app-conversation',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    SpinnerComponent,
    ButtonComponent,
    FormFieldComponent,
    InputComponent,
    LucidePin,
    LucideReply,
    LucideChevronDown,
    LucideTrash2,
    LucideMail,
    LucideMailOpen,
    LucideMessageSquare,
  ],
  templateUrl: './conversation.component.html',
})
export class ConversationComponent {
  @ViewChild('messagesEnd') messagesEnd!: ElementRef<HTMLDivElement>;

  readonly service = inject(BerichtenService);
  readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  readonly replyOpen = signal<string | null>(null); // berichtId being replied to
  readonly replyBody = signal('');
  readonly sendingReply = signal(false);
  readonly deletingId = signal<string | null>(null);

  readonly isAdmin = () => this.auth.hasAnyRole(['Beheer', 'Bestuur']);

  readonly pinnedBerichten = computed(() =>
    this.service.berichten().filter(b => b.pinnedAt !== null)
  );

  readonly regularBerichten = computed(() =>
    this.service.berichten()
  );

  constructor() {
    // Scroll to bottom when new berichten arrive for the active group
    effect(() => {
      const msgs = this.service.berichten();
      if (msgs.length > 0) {
        // Give DOM time to render
        setTimeout(() => {
          this.messagesEnd?.nativeElement?.scrollIntoView({ behavior: 'smooth' });
        }, 50);
      }
    });
  }

  isOwnMessage(bericht: Bericht): boolean {
    return bericht.authorUid === this.auth.currentUser()?.uid;
  }

  canDelete(bericht: Bericht): boolean {
    return this.auth.currentUser()?.uid === bericht.authorUid || this.auth.hasAnyRole(['Beheer', 'Bestuur']);
  }

  isRead(bericht: Bericht): boolean {
    return this.service.readBerichtIds().has(bericht.id);
  }

  loadMore(): void {
    this.service.loadMoreBerichten();
  }

  openReply(berichtId: string): void {
    this.replyOpen.set(berichtId);
    this.replyBody.set('');
  }

  closeReply(): void {
    this.replyOpen.set(null);
    this.replyBody.set('');
  }

  async submitReply(berichtId: string): Promise<void> {
    const body = this.replyBody().trim();
    if (!body) return;
    this.sendingReply.set(true);
    try {
      await this.service.addReply(berichtId, body);
      this.closeReply();
      this.toast.success('Reactie geplaatst.');
    } catch {
      this.toast.error('Reactie kon niet worden geplaatst.');
    } finally {
      this.sendingReply.set(false);
    }
  }

  async togglePin(bericht: Bericht): Promise<void> {
    try {
      // Ensure the ID token is fresh so the Beheer claim reaches the Cloud Function.
      await this.auth.refreshUser();
      await this.service.pinBericht(bericht.id, bericht.pinnedAt === null);
    } catch {
      this.toast.error('Vastpinnen mislukt.');
    }
  }

  async deleteBericht(bericht: Bericht): Promise<void> {
    this.deletingId.set(bericht.id);
    try {
      await this.auth.refreshUser();
      await this.service.deleteNieuwBericht(bericht.id);
      this.toast.success('Bericht verwijderd.');
    } catch {
      this.toast.error('Verwijderen mislukt.');
    } finally {
      this.deletingId.set(null);
    }
  }

  async toggleRead(bericht: Bericht): Promise<void> {
    const groepId = this.service.activeGroepId();
    if (!groepId) return;
    try {
      if (this.isRead(bericht)) {
        await this.service.markUnread(bericht.id, groepId);
        const s = new Set(this.service.readBerichtIds());
        s.delete(bericht.id);
        this.service.readBerichtIds.set(s);
      } else {
        await this.service.markRead(bericht.id, groepId);
        const s = new Set(this.service.readBerichtIds());
        s.add(bericht.id);
        this.service.readBerichtIds.set(s);
      }
    } catch {
      this.toast.error('Status kon niet worden gewijzigd.');
    }
  }
}
