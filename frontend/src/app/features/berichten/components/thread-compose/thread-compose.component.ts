import {
  Component,
  inject,
  model,
  signal,
  output,
  input,
  OnInit,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GroepenService } from '../../services/groepen.service';
import { ThreadsService, ThreadConcept } from '../../services/threads.service';
import { ToastService } from '../../../../shared/components/toast/toast.service';
import {
  InputComponent,
  TextareaComponent,
  ButtonComponent,
} from '../../../../shared/components/design-system';
import { LucideFileText } from '../../../../shared/lucide-icons';

// Safelist for dynamic Tailwind classes — do NOT remove
const _TW_SAFELIST = [
  'text-scuba-600',
  'dark:text-scuba-400',
  'hover:underline',
  'text-red-500',
  'hover:text-red-700',
];

@Component({
  selector: 'app-thread-compose',
  templateUrl: './thread-compose.component.html',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    CommonModule,
    FormsModule,
    InputComponent,
    TextareaComponent,
    ButtonComponent,
    LucideFileText,
  ],
})
export class ThreadComposeComponent implements OnInit {
  protected readonly groepenService = inject(GroepenService);
  protected readonly threadsService = inject(ThreadsService);
  private readonly toast = inject(ToastService);

  readonly created = output<string>();
  readonly cancelled = output<void>();

  /** Optional: pre-load a thread concept when the panel opens */
  readonly initialConcept = input<ThreadConcept | null>(null);

  title = model('');
  body = model('');
  saving = signal(false);
  savingConcept = signal(false);
  editingConceptId = signal<string | null>(null);

  ngOnInit(): void {
    const concept = this.initialConcept();
    if (concept) this.loadConcept(concept);
  }

  get canSubmit(): boolean {
    return this.title().trim().length > 0;
  }

  get isBusy(): boolean {
    return this.saving() || this.savingConcept();
  }

  async submit(): Promise<void> {
    const groepId = this.groepenService.activeGroepId();
    if (!groepId || !this.canSubmit || this.isBusy) return;
    this.saving.set(true);
    try {
      const result = await this.threadsService.createThread(groepId, this.title(), this.body());
      this.toast.success('Thread aangemaakt.');
      this.resetForm();
      this.created.emit(result.threadId);
    } catch {
      this.toast.error('Aanmaken mislukt. Probeer opnieuw.');
    } finally {
      this.saving.set(false);
    }
  }

  async saveAsConcept(): Promise<void> {
    const groepId = this.groepenService.activeGroepId();
    if (!groepId || !this.canSubmit || this.isBusy) return;
    this.savingConcept.set(true);
    try {
      const conceptId = this.editingConceptId() ?? undefined;
      await this.threadsService.saveThreadConcept(groepId, this.title(), this.body(), conceptId);
      this.toast.success('Concept opgeslagen.');
      this.resetForm();
    } catch {
      this.toast.error('Opslaan mislukt. Probeer opnieuw.');
    } finally {
      this.savingConcept.set(false);
    }
  }

  loadConcept(concept: ThreadConcept): void {
    this.title.set(concept.title);
    this.body.set(concept.body);
    this.editingConceptId.set(concept.id);
  }

  async publishConcept(conceptId: string): Promise<void> {
    try {
      const result = await this.threadsService.publishThreadConcept(conceptId);
      this.toast.success('Thread gepubliceerd.');
      if (this.editingConceptId() === conceptId) this.resetForm();
      this.created.emit(result.threadId);
    } catch {
      this.toast.error('Publiceren mislukt.');
    }
  }

  async deleteConcept(conceptId: string): Promise<void> {
    try {
      await this.threadsService.deleteThreadConcept(conceptId);
      this.toast.success('Concept verwijderd.');
      if (this.editingConceptId() === conceptId) this.resetForm();
    } catch {
      this.toast.error('Verwijderen mislukt.');
    }
  }

  private resetForm(): void {
    this.title.set('');
    this.body.set('');
    this.editingConceptId.set(null);
  }
}
