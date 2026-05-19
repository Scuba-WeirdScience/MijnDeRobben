import { Component, computed, effect, inject, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GroepenService } from '../../services/groepen.service';
import { ThreadsService, ThreadConcept, Thread } from '../../services/threads.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { ToastService } from '../../../../shared/components/toast/toast.service';
import { LucidePlus, LucideHash, LucidePin, LucideTrash2, LucideFileText } from '../../../../shared/lucide-icons';
import { InputComponent, TextareaComponent, ButtonComponent, SkeletonRowsComponent, ConfirmDialogComponent } from '../../../../shared/components/design-system';
import { EmoticonPipe } from '../../../../shared/pipes/emoticon.pipe';
import { ActiviteitenService, ActiviteitDoc } from '../../../activiteiten/activiteiten.service';

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
  imports: [CommonModule, LucidePlus, LucideHash, LucidePin, LucideTrash2, LucideFileText, InputComponent, TextareaComponent, ButtonComponent, EmoticonPipe, SkeletonRowsComponent, ConfirmDialogComponent],
})
export class ThreadListComponent {
  protected readonly groepenService = inject(GroepenService);
  protected readonly threadsService = inject(ThreadsService);
  protected readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly activiteitenService = inject(ActiviteitenService);

  readonly threadSelected = output<string>();
  readonly newThread = output<void>();

  readonly isNonLid = computed(() =>
    this.auth.hasAnyRole(['Beheer', 'Bestuur', 'MateriaalCommissie', 'InstructieKader'])
  );

  readonly isAdmin = computed(() =>
    this.auth.hasAnyRole(['Beheer', 'Bestuur'])
  );

  canDeleteThread(thread: Thread): boolean {
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

  // ── Delete-thread confirmation state ──────────────────────────────────────
  /** Thread pending confirmation — opens the first dialog */
  threadToDelete = signal<Thread | null>(null);
  /** Linked activiteit found for the thread pending deletion (null = none) */
  linkedActiviteit = signal<ActiviteitDoc | null>(null);
  /** After thread is confirmed: ask whether to also delete the activiteit */
  showActiviteitConfirm = signal(false);
  deleting = signal(false);

  get isBusy(): boolean { return this.saving() || this.savingConcept(); }

  constructor() {
    // Reset form when active groep changes
    effect(() => {
      this.groepenService.activeGroepId();
      this.showForm.set(false);
      this.newTitle.set('');
      this.newBody.set('');
      this.saveAsDraft.set(false);
      this.editingConceptId.set(null);
    });
  }

  selectThread(threadId: string): void {
    this.threadsService.selectThread(threadId);
    this.threadSelected.emit(threadId);
  }

  getThreadUnread(thread: Thread): number {
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
    const groepId = this.groepenService.activeGroepId();
    if (!groepId || !this.newTitle().trim() || this.isBusy) return;
    this.saving.set(true);
    try {
      const result = await this.threadsService.createThread(groepId, this.newTitle(), this.newBody());
      this.toast.success('Thread aangemaakt.');
      this.showForm.set(false);
      this.saveAsDraft.set(false);
      this.editingConceptId.set(null);
      this.threadsService.selectThread(result.threadId);
      this.threadSelected.emit(result.threadId);
    } catch {
      this.toast.error('Aanmaken mislukt. Probeer opnieuw.');
    } finally {
      this.saving.set(false);
    }
  }

  async saveAsConcept(): Promise<void> {
    const groepId = this.groepenService.activeGroepId();
    if (!groepId || !this.newTitle().trim() || this.isBusy) return;
    this.savingConcept.set(true);
    try {
      const conceptId = this.editingConceptId() ?? undefined;
      await this.threadsService.saveThreadConcept(groepId, this.newTitle(), this.newBody(), conceptId);
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
      const result = await this.threadsService.publishThreadConcept(conceptId);
      this.toast.success('Thread gepubliceerd.');
      if (this.editingConceptId() === conceptId) {
        this.showForm.set(false);
        this.editingConceptId.set(null);
      }
      this.threadsService.selectThread(result.threadId);
      this.threadSelected.emit(result.threadId);
    } catch {
      this.toast.error('Publiceren mislukt.');
    }
  }

  async deleteConcept(conceptId: string): Promise<void> {
    try {
      await this.threadsService.deleteThreadConcept(conceptId);
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

  // ── Delete thread flow ─────────────────────────────────────────────────────

  /** Step 1: user clicks the trash icon — look up linked activiteit, open first dialog. */
  initiateDeleteThread(thread: Thread): void {
    this.threadToDelete.set(thread);
    this.linkedActiviteit.set(null);
    // Look up linked activiteit in the background; dialog is already open
    this.activiteitenService.getActiviteitByThreadId(thread.id).subscribe({
      next: (activiteit) => this.linkedActiviteit.set(activiteit),
      error: () => this.linkedActiviteit.set(null),
    });
  }

  cancelDeleteThread(): void {
    this.threadToDelete.set(null);
    this.linkedActiviteit.set(null);
    this.showActiviteitConfirm.set(false);
  }

  /** Step 2: thread deletion confirmed — if linked activiteit exists, ask about it. */
  onThreadDeleteConfirmed(): void {
    if (this.linkedActiviteit()) {
      this.showActiviteitConfirm.set(true);
    } else {
      this.executeDelete(false);
    }
  }

  /** Step 3a: user confirms activiteit should also be deleted. */
  onActiviteitDeleteConfirmed(): void {
    this.executeDelete(true);
  }

  /** Step 3b: user skips activiteit deletion. */
  onActiviteitDeleteSkipped(): void {
    this.executeDelete(false);
  }

  private async executeDelete(alsoDeleteActiviteit: boolean): Promise<void> {
    const thread = this.threadToDelete();
    const groepId = this.groepenService.activeGroepId();
    const activiteit = this.linkedActiviteit();
    if (!thread || !groepId) return;

    this.showActiviteitConfirm.set(false);
    this.deletingThreadId.set(thread.id);
    this.deleting.set(true);
    try {
      await this.threadsService.deleteThread(thread.id, groepId);
      if (alsoDeleteActiviteit && activiteit) {
        await this.activiteitenService.deleteActiviteit({ id: activiteit.id, scope: 'all' }).toPromise();
        this.toast.success('Thread en activiteit verwijderd.');
      } else {
        this.toast.success('Thread verwijderd.');
      }
      if (this.threadsService.activeThreadId() === thread.id) {
        this.threadsService.selectThread('');
      }
    } catch {
      this.toast.error('Verwijderen mislukt. Probeer opnieuw.');
    } finally {
      this.deletingThreadId.set(null);
      this.deleting.set(false);
      this.threadToDelete.set(null);
      this.linkedActiviteit.set(null);
    }
  }
}
