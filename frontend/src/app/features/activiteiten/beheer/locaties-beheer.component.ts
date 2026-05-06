import { Component, inject, signal, OnInit, output } from '@angular/core';
import {
  SidePanelComponent,
  ButtonComponent,
  SpinnerComponent,
  EmptyStateComponent,
  ConfirmDialogComponent,
} from '../../../shared/components/design-system';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { ActiviteitenService, LocatieDoc } from '../activiteiten.service';
import { LocatieFormComponent } from './locatie-form.component';

@Component({
  selector: 'app-locaties-beheer',
  standalone: true,
  imports: [
    SidePanelComponent,
    ButtonComponent,
    SpinnerComponent,
    EmptyStateComponent,
    ConfirmDialogComponent,
    LocatieFormComponent,
  ],
  templateUrl: './locaties-beheer.component.html',
})
export class LocatiesBeheerComponent implements OnInit {
  private readonly service = inject(ActiviteitenService);
  private readonly toast = inject(ToastService);

  readonly closed = output<void>();

  readonly loading = signal(false);
  readonly locaties = signal<LocatieDoc[]>([]);
  readonly editingLocatie = signal<LocatieDoc | null>(null);
  readonly showForm = signal(false);
  readonly locatieToDelete = signal<LocatieDoc | null>(null);
  readonly deleting = signal(false);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.service.getLocaties().subscribe({
      next: list => {
        this.locaties.set(list);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.error('Locaties konden niet worden geladen.');
      },
    });
  }

  openForm(locatie: LocatieDoc | null): void {
    this.editingLocatie.set(locatie);
    this.showForm.set(true);
  }

  onSaved(): void {
    this.showForm.set(false);
    this.editingLocatie.set(null);
    this.load();
  }

  onFormCancelled(): void {
    this.showForm.set(false);
    this.editingLocatie.set(null);
  }

  confirmDelete(locatie: LocatieDoc): void {
    this.locatieToDelete.set(locatie);
  }

  deleteConfirmed(): void {
    const l = this.locatieToDelete();
    if (!l) return;
    this.deleting.set(true);
    this.service.deleteLocatie(l.id).subscribe({
      next: () => {
        this.locatieToDelete.set(null);
        this.deleting.set(false);
        this.load();
        this.toast.success('Locatie verwijderd.');
      },
      error: () => {
        this.deleting.set(false);
        this.toast.error('Verwijderen mislukt.');
      },
    });
  }
}
