import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SpinnerComponent, ButtonComponent, ConfirmDialogComponent } from '../../../shared/components/design-system';
import { LocaleDateTimePipe } from '../../../shared/pipes/locale-datetime.pipe';
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
import { MemberService, Member } from '../../members/services/member.service';

@Component({
  selector: 'app-activiteiten-detail-page',
  standalone: true,
  imports: [RouterLink, SpinnerComponent, ButtonComponent, ConfirmDialogComponent, ActiviteitInschrijvingComponent, LocaleDateTimePipe],
  templateUrl: './activiteiten-detail-page.component.html',
})
export class ActiviteitenDetailPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly service = inject(ActiviteitenService);
  private readonly memberService = inject(MemberService);
  readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  readonly loading = signal(true);
  readonly activiteit = signal<ActiviteitDoc | null>(null);
  readonly overrides = signal<ActiviteitOccurrenceDoc[]>([]);
  readonly mijnRegistratie = signal<ActiviteitRegistratieDoc | null>(null);
  readonly registraties = signal<ActiviteitRegistratieDoc[]>([]);
  readonly kinderen = signal<Member[]>([]);

  readonly occurrenceDatum = signal<string | null>(null);

  readonly resetting = signal(false);
  readonly confirmReset = signal(false);
  readonly loadingRegistraties = signal(false);

  readonly isAdminOfOrganisator = computed(() =>
    this.auth.hasAnyRole(['Beheer', 'Bestuur'])
  );

  readonly registratiesZichtbaar = computed(() => {
    const occ = this.occurrence();
    if (!occ || !this.auth.isAuthenticated()) return false;
    const zichtbaar = occ.registratiesZichtbaar;
    if (zichtbaar === 'beheer') return this.isAdminOfOrganisator();
    return true; // 'iedereen' | 'aangemeld'
  });

  readonly occurrence = computed((): ResolvedOccurrence | null => {
    const a = this.activiteit();
    if (!a) return null;
    const datum = this.occurrenceDatum() ?? a.startDatumTijd.substring(0, 10);
    const results = generateOccurrences([a], new Date(datum + 'T00:00:00'), new Date(datum + 'T23:59:59'), this.overrides());
    return results[0] ?? null;
  });

  /** Registratiestatus per kind (memberId → registratie of null) */
  readonly kinderenRegistraties = computed((): Map<string, ActiviteitRegistratieDoc | null> => {
    const map = new Map<string, ActiviteitRegistratieDoc | null>();
    const alleReg = this.registraties();
    for (const kind of this.kinderen()) {
      const reg = alleReg.find(r => r.memberId === kind.id && r.status === 'aangemeld') ?? null;
      map.set(kind.id, reg);
    }
    return map;
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
            // Load registratie after occurrence() is fully resolved so the
            // datum match is reliable (occurrence depends on overrides).
            if (this.auth.isAuthenticated()) {
              this.service.getMijnRegistraties().subscribe({
                next: list => {
                  const resolvedDatum = this.occurrence()?.occurrenceDatum ?? datum;
                  const occ = list.find(r =>
                    r.activiteitId === id &&
                    (!resolvedDatum || r.occurrenceDatum === resolvedDatum) &&
                    r.status === 'aangemeld'
                  );
                  this.mijnRegistratie.set(occ ?? null);
                },
                // eslint-disable-next-line @typescript-eslint/no-empty-function
                error: () => {},
              });
              this.loadRegistraties(id);
              // Kinderen laden voor verzorger-context
              this.memberService.getMijnKinderen().subscribe({
                next: kids => this.kinderen.set(kids),
                // eslint-disable-next-line @typescript-eslint/no-empty-function
                error: () => {},
              });
            }
          },
          error: () => this.loading.set(false),
        });
      },
      error: () => this.loading.set(false),
    });
  }

  onGeregistreerd(): void {
    // Reload mijn registraties
    const id = this.activiteit()?.id;
    if (!id) return;
    this.service.getMijnRegistraties().subscribe({
      next: list => {
        const resolvedDatum = this.occurrence()?.occurrenceDatum ?? this.occurrenceDatum();
        const occ = list.find(r =>
          r.activiteitId === id &&
          (!resolvedDatum || r.occurrenceDatum === resolvedDatum) &&
          r.status === 'aangemeld'
        );
        this.mijnRegistratie.set(occ ?? null);
      },
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      error: () => {},
    });
    this.loadRegistraties(id);
  }

  onGeannuleerd(): void {
    this.mijnRegistratie.set(null);
    const id = this.activiteit()?.id;
    if (id) this.loadRegistraties(id);
  }

  private loadRegistraties(activiteitId: string): void {
    const resolvedDatum = this.occurrence()?.occurrenceDatum;
    if (!resolvedDatum) return;
    this.loadingRegistraties.set(true);
    this.service.getRegistraties(activiteitId, resolvedDatum).subscribe({
      next: list => {
        this.registraties.set(list.filter(r => r.status === 'aangemeld'));
        this.loadingRegistraties.set(false);
      },
      error: () => this.loadingRegistraties.set(false),
    });
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
}
