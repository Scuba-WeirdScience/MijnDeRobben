import { Component, computed, inject, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BerichtenService } from '../../berichten.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { ToastService } from '../../../../shared/components/toast/toast.service';
import { LucidePlus, LucideHash, LucidePin, LucideTrash2 } from '../../../../shared/lucide-icons';
import { InputComponent, TextareaComponent, ButtonComponent } from '../../../../shared/components/design-system';
import { EmoticonPipe } from '../../../../shared/pipes/emoticon.pipe';

const _TW_SAFELIST = [
  'bg-scuba-50', 'border-scuba-500', 'text-scuba-700',
  'dark:bg-scuba-900/20', 'dark:border-scuba-400', 'dark:text-scuba-300',
  'border-amber-400', 'bg-amber-50', 'dark:bg-amber-900/20',
  'hover:text-red-500', 'dark:hover:text-red-400',
];

@Component({
  selector: 'app-thread-list',
  templateUrl: './thread-list.component.html',
  standalone: true,
  imports: [CommonModule, LucidePlus, LucideHash, LucidePin, LucideTrash2, InputComponent, TextareaComponent, ButtonComponent, EmoticonPipe],
})
export class ThreadListComponent {
  protected readonly service = inject(BerichtenService);
  protected readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  readonly threadSelected = output<void>();
  readonly newThread = output<void>();

  readonly isNonLid = computed(() =>
    this.auth.hasAnyRole(['Beheer', 'Bestuur', 'MateriaalCommissie', 'InstructieKader'])
  );

  readonly isAdmin = computed(() =>
    this.auth.hasAnyRole(['Beheer', 'Bestuur'])
  );

  canDeleteThread(thread: any): boolean {
    return this.isAdmin() || thread.authorUid === this.auth.currentUser()?.uid;
  }

  // Inline new-thread form
  showForm = signal(false);
  newTitle = signal('');
  newBody = signal('');
  saving = signal(false);
  deletingThreadId = signal<string | null>(null);

  selectThread(threadId: string): void {
    this.service.selectThread(threadId);
    this.threadSelected.emit();
  }

  getThreadUnread(thread: any): number {
    const uid = this.auth.currentUser()?.uid;
    if (!uid) return 0;
    return thread.unreadPerUser?.[uid] ?? 0;
  }

  openForm(): void {
    this.showForm.set(true);
    this.newTitle.set('');
    this.newBody.set('');
  }

  cancelForm(): void {
    this.showForm.set(false);
  }

  async submitForm(): Promise<void> {
    const groepId = this.service.activeGroepId();
    if (!groepId || !this.newTitle().trim()) return;
    this.saving.set(true);
    try {
      const result = await this.service.createThread(groepId, this.newTitle(), this.newBody());
      this.toast.success('Thread aangemaakt.');
      this.showForm.set(false);
      this.service.selectThread(result.threadId);
      this.threadSelected.emit();
    } catch {
      this.toast.error('Aanmaken mislukt. Probeer opnieuw.');
    } finally {
      this.saving.set(false);
    }
  }

  async deleteThread(thread: any): Promise<void> {
    if (!confirm(`Thread "${thread.title}" en alle berichten verwijderen?`)) return;
    const groepId = this.service.activeGroepId();
    if (!groepId) return;
    this.deletingThreadId.set(thread.id);
    try {
      await this.service.deleteThread(thread.id, groepId);
      this.toast.success('Thread verwijderd.');
      if (this.service.activeThreadId() === thread.id) {
        this.service.selectThread('');
      }
    } catch {
      this.toast.error('Verwijderen mislukt. Probeer opnieuw.');
    } finally {
      this.deletingThreadId.set(null);
    }
  }
}
