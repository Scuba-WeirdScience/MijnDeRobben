import { Component, computed, effect, inject, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BerichtenService, ThreadConcept } from '../../berichten.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { ToastService } from '../../../../shared/components/toast/toast.service';
import { LucidePlus, LucideHash, LucidePin, LucideTrash2, LucideFileText } from '../../../../shared/lucide-icons';
import { InputComponent, TextareaComponent, ButtonComponent } from '../../../../shared/components/design-system';
import { EmoticonPipe } from '../../../../shared/pipes/emoticon.pipe';

const _TW_SAFELIST = [
  'bg-scuba-50', 'border-scuba-500', 'text-scuba-700',
  'dark:bg-scuba-900/20', 'dark:border-scuba-400', 'dark:text-scuba-300',
  'border-amber-400', 'bg-amber-50', 'dark:bg-amber-900/20',
  'hover:text-red-500', 'dark:hover:text-red-400',
  'bg-scuba-600', 'hover:bg-scuba-700',
  'text-scuba-600', 'dark:text-scuba-400', 'hover:underline', 'text-red-500',
];

@Component({
  selector: 'app-thread-list',
  templateUrl: './thread-list.component.html',
  standalone: true,
  imports: [CommonModule, LucidePlus, LucideHash, LucidePin, LucideTrash2, LucideFileText, InputComponent, TextareaComponent, ButtonComponent, EmoticonPipe],
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
  saveAsDraft = signal(false);
  saving = signal(false);
  savingConcept = signal(false);
  editingConceptId = signal<string | null>(null);
  deletingThreadId = signal<string | null>(null);

  get isBusy(): boolean { return this.saving() || this.savingConcept(); }

  constructor() {
    // Reset form when active groep changes
    effect(() => {
      this.service.activeGroepId();
      this.showForm.set(false);
      this.newTitle.set('');
      this.newBody.set('');
      this.saveAsDraft.set(false);
      this.editingConceptId.set(null);
    });
  }

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
    this.saveAsDraft.set(false);
    this.editingConceptId.set(null);
  }

  cancelForm(): void {
    this.showForm.set(false);
    this.saveAsDraft.set(false);
    this.editingConceptId.set(null);
  }

  async submitForm(): Promise<void> {
    if (this.saveAsDraft()) {
      await this.saveAsConcept();
    } else {
      await this._createThread();
    }
  }

  private async _createThread(): Promise<void> {
    const groepId = this.service.activeGroepId();
    if (!groepId || !this.newTitle().trim() || this.isBusy) return;
    this.saving.set(true);
    try {
      const result = await this.service.createThread(groepId, this.newTitle(), this.newBody());
      this.toast.success('Thread aangemaakt.');
      this.showForm.set(false);
      this.saveAsDraft.set(false);
      this.editingConceptId.set(null);
      this.service.selectThread(result.threadId);
      this.threadSelected.emit();
    } catch {
      this.toast.error('Aanmaken mislukt. Probeer opnieuw.');
    } finally {
      this.saving.set(false);
    }
  }

  async saveAsConcept(): Promise<void> {
    const groepId = this.service.activeGroepId();
    if (!groepId || !this.newTitle().trim() || this.isBusy) return;
    this.savingConcept.set(true);
    try {
      const conceptId = this.editingConceptId() ?? undefined;
      await this.service.saveThreadConcept(groepId, this.newTitle(), this.newBody(), conceptId);
      this.toast.success('Concept opgeslagen.');
      this.showForm.set(false);
      this.saveAsDraft.set(false);
      this.editingConceptId.set(null);
      this.newTitle.set('');
      this.newBody.set('');
    } catch {
      this.toast.error('Opslaan mislukt. Probeer opnieuw.');
    } finally {
      this.savingConcept.set(false);
    }
  }

  loadConcept(concept: ThreadConcept): void {
    this.showForm.set(true);
    this.newTitle.set(concept.title);
    this.newBody.set(concept.body);
    this.saveAsDraft.set(true);
    this.editingConceptId.set(concept.id);
  }

  async publishConcept(conceptId: string): Promise<void> {
    try {
      const result = await this.service.publishThreadConcept(conceptId);
      this.toast.success('Thread gepubliceerd.');
      if (this.editingConceptId() === conceptId) {
        this.showForm.set(false);
        this.editingConceptId.set(null);
      }
      this.service.selectThread(result.threadId);
      this.threadSelected.emit();
    } catch {
      this.toast.error('Publiceren mislukt.');
    }
  }

  async deleteConcept(conceptId: string): Promise<void> {
    try {
      await this.service.deleteThreadConcept(conceptId);
      this.toast.success('Concept verwijderd.');
      if (this.editingConceptId() === conceptId) {
        this.showForm.set(false);
        this.editingConceptId.set(null);
        this.newTitle.set('');
        this.newBody.set('');
      }
    } catch {
      this.toast.error('Verwijderen mislukt.');
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
