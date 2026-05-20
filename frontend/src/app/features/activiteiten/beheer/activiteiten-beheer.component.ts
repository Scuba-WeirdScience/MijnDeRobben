import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { NgClass } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, NavigationEnd, RouterOutlet } from '@angular/router';
import { BreakpointObserver } from '@angular/cdk/layout';
import { filter, startWith, map } from 'rxjs';
import { addMonths } from 'date-fns';
import { LocaleDatePipe } from '../../../shared/pipes/locale-date.pipe';
import { LocaleDateTimePipe } from '../../../shared/pipes/locale-datetime.pipe';
import {
  ButtonComponent,
  SpinnerComponent,
  EmptyStateComponent,
  ConfirmDialogComponent,
  SkeletonRowsComponent,
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
    RouterOutlet,
    ButtonComponent,
    SpinnerComponent,
    EmptyStateComponent,
    ConfirmDialogComponent,
    SkeletonRowsComponent,
    ActiviteitFormComponent,
    ActiviteitOccurrenceEditComponent,
    LocatiesBeheerComponent,
    ActiviteitOccurrenceDialogComponent,
    LocaleDatePipe,
    LocaleDateTimePipe,
  ],
  templateUrl: './activiteiten-beheer.component.html',
})
export class ActiviteitenBeheerComponent implements OnInit {
  private readonly service = inject(ActiviteitenService);
  private readonly toast = inject(ToastService);
  protected readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly isMobile = toSignal(
    inject(BreakpointObserver).observe('(max-width: 767px)').pipe(
      map(r => r.matches)
    ),
    { initialValue: false }
  );

  /** On mobile: which panel is visible — 'list' or 'detail' */
  mobileView = signal<'list' | 'detail'>('list');

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

    // After data loads (or on nav), select the activiteit from the URL param.
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      startWith(null),
    ).subscribe(() => {
      const id = this.route.firstChild?.snapshot.params['activiteitId'];
      if (id && id !== this.selectedActiviteit()?.id) {
        // If list already loaded, select immediately; else defer to loadAll().
        const found = this.activiteiten().find(a => a.id === id);
        if (found) {
          this.selectActiviteit(found);
        } else {
          this._pendingSelectId = id;
        }
      }
    });
  }

  private _pendingSelectId: string | null = null;

  loadAll(): void {
    this.loading.set(true);
    this.service.getAllActiviteiten().subscribe({
      next: list => {
        this.activiteiten.set(list.sort((a, b) => a.startDatumTijd.localeCompare(b.startDatumTijd)));
        this.loading.set(false);
        // Resolve any pending URL-driven selection that arrived before the list loaded
        if (this._pendingSelectId) {
          const found = this.activiteiten().find(a => a.id === this._pendingSelectId);
          if (found) {
            this.selectActiviteit(found);
          }
          this._pendingSelectId = null;
        }
      },
      error: () => {
        this.loading.set(false);
        this.toast.error('Activiteiten konden niet worden geladen.');
      },
    });
    this.service.getAllOccurrenceOverrides().subscribe({
      next: list => this.overrides.set(list),
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      error: () => {},
    });
    this.service.getLocaties().subscribe({
      next: list => this.locaties.set(list),
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      error: () => {},
    });
  }

  selectActiviteit(a: ActiviteitDoc): void {
    this.selectedActiviteit.set(a);
    this.selectedOccurrenceDatum.set(null);
    this.registraties.set([]);
    this.mobileView.set('detail');
    this.router.navigate(['/activiteiten/beheer', a.id]);
    // Voor niet-herhalende activiteiten: laad registraties direct, want er zijn
    // geen aankomende occurrence-rijen om op te klikken als de datum in het verleden ligt.
    if (!a.isHerhalend && a.inschrijvingenActief) {
      const occurrenceDatum = a.startDatumTijd.substring(0, 10);
      this.selectedOccurrenceDatum.set(occurrenceDatum);
      this.loadingRegistraties.set(true);
      this.service.getRegistraties(a.id, occurrenceDatum).subscribe({
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
    if (!a) this.selectedActiviteit.set(null);
    this.showActiviteitForm.set(true);
  }

  onActiviteitSaved(): void {
    const wasEditing = this.editingActiviteit();
    this.showActiviteitForm.set(false);
    this.editingActiviteit.set(null);
    this.loadAll();
    // Keep the activiteit selected after editing so the detail view reappears
    if (!wasEditing) this.selectedActiviteit.set(null);
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
}
