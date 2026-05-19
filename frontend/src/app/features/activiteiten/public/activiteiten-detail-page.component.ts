import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { format, parseISO } from 'date-fns';
import { nl } from 'date-fns/locale';
import { SpinnerComponent, ButtonComponent, ConfirmDialogComponent } from '../../../shared/components/design-system';
import { AuthService } from '../../../core/auth/auth.service';
import { ToastService } from '../../../shared/components/toast/toast.service';
import {
  ActiviteitenService,
  ActiviteitDoc,
  ActiviteitOccurrenceDoc,
  ActiviteitRegistratieDoc,
  ResolvedOccurrence,
  generateOccurrences,
} from '../activiteiten.service';
import { ActiviteitInschrijvingComponent } from './components/activiteit-inschrijving.component';

@Component({
  selector: 'app-activiteiten-detail-page',
  standalone: true,
  imports: [RouterLink, SpinnerComponent, ButtonComponent, ConfirmDialogComponent, ActiviteitInschrijvingComponent],
  templateUrl: './activiteiten-detail-page.component.html',
})
export class ActiviteitenDetailPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly service = inject(ActiviteitenService);
  readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  readonly loading = signal(true);
  readonly activiteit = signal<ActiviteitDoc | null>(null);
  readonly overrides = signal<ActiviteitOccurrenceDoc[]>([]);
  readonly mijnRegistratie = signal<ActiviteitRegistratieDoc | null>(null);
  readonly registraties = signal<ActiviteitRegistratieDoc[]>([]);

  readonly occurrenceDatum = signal<string | null>(null);

  readonly resetting = signal(false);
  readonly confirmReset = signal(false);

  readonly isAdminOfOrganisator = computed(() =>
    this.auth.hasAnyRole(['Beheer', 'Bestuur'])
  );

  readonly occurrence = computed((): ResolvedOccurrence | null => {
    const a = this.activiteit();
    if (!a) return null;
    const datum = this.occurrenceDatum() ?? a.startDatumTijd.substring(0, 10);
    const results = generateOccurrences([a], new Date(datum + 'T00:00:00'), new Date(datum + 'T23:59:59'), this.overrides());
    return results[0] ?? null;
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    const datum = this.route.snapshot.queryParamMap.get('datum');
    if (datum) this.occurrenceDatum.set(datum);

    this.service.getActiviteit(id).subscribe({
      next: a => {
        this.activiteit.set(a);
        this.service.getOccurrenceOverrides(id).subscribe({
          next: overrides => {
            this.overrides.set(overrides);
            this.loading.set(false);
          },
          error: () => this.loading.set(false),
        });
      },
      error: () => this.loading.set(false),
    });

    if (this.auth.isAuthenticated()) {
      this.service.getMijnRegistraties().subscribe({
        next: list => {
          const occ = list.find(r => r.activiteitId === id && (!datum || r.occurrenceDatum === datum));
          this.mijnRegistratie.set(occ ?? null);
        },
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        error: () => {},
      });
    }
  }

  onGeregistreerd(): void {
    // Reload mijn registraties
    const id = this.activiteit()?.id;
    if (!id) return;
    this.service.getMijnRegistraties().subscribe({
      next: list => {
        const datum = this.occurrenceDatum();
        const occ = list.find(r => r.activiteitId === id && (!datum || r.occurrenceDatum === datum));
        this.mijnRegistratie.set(occ ?? null);
      },
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      error: () => {},
    });
  }

  onGeannuleerd(): void {
    this.mijnRegistratie.set(null);
  }

  resetInschrijvingenConfirmed(): void {
    const occ = this.occurrence();
    if (!occ) return;
    this.resetting.set(true);
    this.service.resetInschrijvingen(occ.activiteitId, occ.occurrenceDatum).subscribe({
      next: () => {
        this.confirmReset.set(false);
        this.resetting.set(false);
        this.mijnRegistratie.set(null);
        this.toast.success('Inschrijvingen gereset.');
      },
      error: () => {
        this.resetting.set(false);
        this.toast.error('Reset mislukt.');
      },
    });
  }

  formatDatum(iso: string): string {
    try {
      return format(parseISO(iso), 'dd MMMM yyyy \'om\' HH:mm', { locale: nl });
    } catch {
      return iso;
    }
  }
}
