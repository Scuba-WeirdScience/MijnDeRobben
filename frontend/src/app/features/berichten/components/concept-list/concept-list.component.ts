import { Component, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { BerichtenService, Bericht } from '../../berichten.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { ToastService } from '../../../../shared/components/toast/toast.service';
import {
  ButtonComponent,
  SidePanelComponent,
  EmptyStateComponent,
  SelectComponent,
  FormFieldComponent,
  TextareaComponent,
  ConfirmDialogComponent,
} from '../../../../shared/components/design-system';
import { LucideEdit2, LucideTrash2, LucideSend } from '../../../../shared/lucide-icons';

@Component({
  selector: 'app-concept-list',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    ButtonComponent,
    SidePanelComponent,
    EmptyStateComponent,
    SelectComponent,
    FormFieldComponent,
    TextareaComponent,
    ConfirmDialogComponent,
    LucideEdit2,
    LucideTrash2,
    LucideSend,
  ],
  templateUrl: './concept-list.component.html',
})
export class ConceptListComponent {
  readonly service = inject(BerichtenService);
  readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  readonly editingConcept = signal<Bericht | null>(null);
  readonly editBody = signal('');
  readonly savingEdit = signal(false);

  readonly publishingConcept = signal<Bericht | null>(null);
  readonly selectedGroepId = signal('');
  readonly publishing = signal(false);

  readonly deleteTarget = signal<Bericht | null>(null);
  readonly deleting = signal(false);

  startEdit(concept: Bericht): void {
    this.editingConcept.set(concept);
    this.editBody.set(concept.body);
  }

  async saveEdit(): Promise<void> {
    const concept = this.editingConcept();
    if (!concept) return;
    const body = this.editBody().trim();
    if (!body) return;

    this.savingEdit.set(true);
    try {
      await this.service.saveConcept({ berichtId: concept.id, body });
      this.editingConcept.set(null);
      this.toast.success('Concept bijgewerkt.');
    } catch {
      this.toast.error('Concept kon niet worden opgeslagen.');
    } finally {
      this.savingEdit.set(false);
    }
  }

  startPublish(concept: Bericht): void {
    this.publishingConcept.set(concept);
    this.selectedGroepId.set(this.service.groepen()[0]?.id ?? '');
  }

  async publishConcept(): Promise<void> {
    const concept = this.publishingConcept();
    const groepId = this.selectedGroepId();
    if (!concept || !groepId) return;

    this.publishing.set(true);
    try {
      await this.service.publishConcept(concept.id, groepId);
      this.publishingConcept.set(null);
      this.toast.success('Concept gepubliceerd.');
    } catch {
      this.toast.error('Concept kon niet worden gepubliceerd.');
    } finally {
      this.publishing.set(false);
    }
  }

  confirmDelete(concept: Bericht): void {
    this.deleteTarget.set(concept);
  }

  async executeDelete(): Promise<void> {
    const target = this.deleteTarget();
    if (!target) return;
    this.deleting.set(true);
    try {
      await this.service.deleteConcept(target.id);
      this.deleteTarget.set(null);
      this.toast.success('Concept verwijderd.');
    } catch {
      this.toast.error('Concept kon niet worden verwijderd.');
    } finally {
      this.deleting.set(false);
    }
  }

  groepOptions(): { value: string; label: string }[] {
    return this.service.groepen().map(g => ({ value: g.id, label: g.name }));
  }
}
