import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { NgClass } from '@angular/common';
import { addMonths, format, parseISO } from 'date-fns';
import { nl } from 'date-fns/locale';
import {
  ButtonComponent,
  SpinnerComponent,
  EmptyStateComponent,
  ConfirmDialogComponent,
} from '../../../shared/components/design-system';
import { ToastService } from '../../../shared/components/toast/toast.service';
import {
  ActiviteitenService,
  ActiviteitDoc,
  ActiviteitOccurrenceDoc,
  ActiviteitRegistratieDoc,
  LocatieDoc,
  ResolvedOccurrence,
  EditScope,
  generateOccurrences,
} from '../activiteiten.service';
import { ActiviteitFormComponent } from './activiteit-form.component';
import { ActiviteitOccurrenceEditComponent } from './activiteit-occurrence-edit.component';
import { LocatiesBeheerComponent } from './locaties-beheer.component';
import { ActiviteitOccurrenceDialogComponent } from './activiteit-occurrence-dialog.component';

@Component({
  selector: 'app-activiteiten-beheer',
  standalone: true,
  imports: [
    NgClass,
    ButtonComponent,
    SpinnerComponent,
    EmptyStateComponent,
    ConfirmDialogComponent,
    ActiviteitFormComponent,
    ActiviteitOccurrenceEditComponent,
    LocatiesBeheerComponent,
    ActiviteitOccurrenceDialogComponent,
  ],
  templateUrl: './activiteiten-beheer.component.html',
})
export class ActiviteitenBeheerComponent implements OnInit {
  private readonly service = inject(ActiviteitenService);
  private readonly toast = inject(ToastService);

  readonly activiteiten = signal<ActiviteitDoc[]>([]);
  readonly overrides = signal<ActiviteitOccurrenceDoc[]>([]);
  readonly locaties = signal<LocatieDoc[]>([]);
  readonly selectedActiviteit = signal<ActiviteitDoc | null>(null);
  readonly selectedOccurrenceDatum = signal<string | null>(null);
  readonly registraties = signal<ActiviteitRegistratieDoc[]>([]);
  readonly previewMaanden = signal(3);
  readonly zoekterm = signal('');
  readonly loading = signal(false);
  readonly loadingRegistraties = signal(false);

  readonly showActiviteitForm = signal(false);
  readonly editingActiviteit = signal<ActiviteitDoc | null>(null);
  readonly showLocatiesBeheer = signal(false);
  readonly editingOccurrence = signal<ResolvedOccurrence | null>(null);

  readonly occurrenceDialogState = signal<{
    activiteit: ActiviteitDoc;
    occurrenceDatum: string;
    action: 'bewerken' | 'verwijderen';
  } | null>(null);

  readonly activiteitToDelete = signal<ActiviteitDoc | null>(null);
  readonly deleting = signal(false);

  readonly resettingOccurrence = signal(false);
  readonly confirmResetOccurrence = signal<{ activiteitId: string; occurrenceDatum: string } | null>(null);

  readonly gefilterd = computed(() => {
    const term = this.zoekterm().toLowerCase().trim();
    if (!term) return this.activiteiten();
    return this.activiteiten().filter(a =>
      a.titel.toLowerCase().includes(term)
    );
  });

  readonly previewOccurrences = computed((): ResolvedOccurrence[] => {
    const a = this.selectedActiviteit();
    if (!a) return [];
    const van = new Date();
    const tot = addMonths(van, this.previewMaanden());
    return generateOccurrences([a], van, tot, this.overrides());
  });

  ngOnInit(): void {
    this.loadAll();
  }

  loadAll(): void {
    this.loading.set(true);
    this.service.getAllActiviteiten().subscribe({
      next: list => {
        this.activiteiten.set(list.sort((a, b) => a.startDatumTijd.localeCompare(b.startDatumTijd)));
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.error('Activiteiten konden niet worden geladen.');
      },
    });
    this.service.getAllOccurrenceOverrides().subscribe({
      next: list => this.overrides.set(list),
      error: () => {},
    });
    this.service.getLocaties().subscribe({
      next: list => this.locaties.set(list),
      error: () => {},
    });
  }

  selectActiviteit(a: ActiviteitDoc): void {
    this.selectedActiviteit.set(a);
    this.selectedOccurrenceDatum.set(null);
    this.registraties.set([]);
  }

  selectOccurrence(occ: ResolvedOccurrence): void {
    this.selectedOccurrenceDatum.set(occ.occurrenceDatum);
    this.loadingRegistraties.set(true);
    this.service.getRegistraties(occ.activiteitId, occ.occurrenceDatum).subscribe({
      next: list => {
        this.registraties.set(list);
        this.loadingRegistraties.set(false);
      },
      error: () => {
        this.loadingRegistraties.set(false);
        this.toast.error('Registraties konden niet worden geladen.');
      },
    });
  }

  openActiviteitForm(a: ActiviteitDoc | null): void {
    this.editingActiviteit.set(a);
    this.showActiviteitForm.set(true);
  }

  onActiviteitSaved(): void {
    this.showActiviteitForm.set(false);
    this.editingActiviteit.set(null);
    this.loadAll();
  }

  onActiviteitFormCancelled(): void {
    this.showActiviteitForm.set(false);
    this.editingActiviteit.set(null);
  }

  openOccurrenceEdit(occ: ResolvedOccurrence): void {
    this.editingOccurrence.set(occ);
  }

  onOccurrenceEditSaved(): void {
    this.editingOccurrence.set(null);
    this.loadAll();
  }

  onOccurrenceEditCancelled(): void {
    this.editingOccurrence.set(null);
  }

  openOccurrenceActie(occ: ResolvedOccurrence, action: 'bewerken' | 'verwijderen'): void {
    const a = this.selectedActiviteit();
    if (!a) return;
    if (a.isHerhalend) {
      this.occurrenceDialogState.set({ activiteit: a, occurrenceDatum: occ.occurrenceDatum, action });
    } else if (action === 'verwijderen') {
      this.activiteitToDelete.set(a);
    } else {
      this.openActiviteitForm(a);
    }
  }

  onOccurrenceScopeGekozen(scope: EditScope): void {
    const state = this.occurrenceDialogState();
    if (!state) return;
    this.occurrenceDialogState.set(null);
    if (state.action === 'verwijderen') {
      this.deleting.set(true);
      this.service.deleteActiviteit({ id: state.activiteit.id, scope, occurrenceDatum: state.occurrenceDatum }).subscribe({
        next: () => {
          this.deleting.set(false);
          this.toast.success('Activiteit verwijderd.');
          this.loadAll();
        },
        error: () => {
          this.deleting.set(false);
          this.toast.error('Verwijderen mislukt.');
        },
      });
    } else {
      this.editingActiviteit.set(state.activiteit);
      this.showActiviteitForm.set(true);
    }
  }

  confirmDeleteActiviteit(a: ActiviteitDoc): void {
    if (a.isHerhalend) {
      this.occurrenceDialogState.set({ activiteit: a, occurrenceDatum: a.startDatumTijd.substring(0, 10), action: 'verwijderen' });
    } else {
      this.activiteitToDelete.set(a);
    }
  }

  deleteActiviteitConfirmed(): void {
    const a = this.activiteitToDelete();
    if (!a) return;
    this.deleting.set(true);
    this.service.deleteActiviteit({ id: a.id, scope: 'all' }).subscribe({
      next: () => {
        this.activiteitToDelete.set(null);
        this.deleting.set(false);
        if (this.selectedActiviteit()?.id === a.id) this.selectedActiviteit.set(null);
        this.loadAll();
        this.toast.success('Activiteit verwijderd.');
      },
      error: () => {
        this.deleting.set(false);
        this.toast.error('Verwijderen mislukt.');
      },
    });
  }

  resetOccurrenceInschrijvingen(occ: ResolvedOccurrence): void {
    this.confirmResetOccurrence.set({ activiteitId: occ.activiteitId, occurrenceDatum: occ.occurrenceDatum });
  }

  resetOccurrenceConfirmed(): void {
    const target = this.confirmResetOccurrence();
    if (!target) return;
    this.resettingOccurrence.set(true);
    this.service.resetInschrijvingen(target.activiteitId, target.occurrenceDatum).subscribe({
      next: () => {
        this.confirmResetOccurrence.set(null);
        this.resettingOccurrence.set(false);
        this.toast.success('Inschrijvingen gereset.');
        if (this.selectedOccurrenceDatum() === target.occurrenceDatum) {
          this.registraties.set([]);
        }
      },
      error: () => {
        this.resettingOccurrence.set(false);
        this.toast.error('Reset mislukt.');
      },
    });
  }

  formatDatum(iso: string): string {
    try {
      return format(parseISO(iso), 'dd/MM/yyyy HH:mm');
    } catch {
      return iso;
    }
  }
}
