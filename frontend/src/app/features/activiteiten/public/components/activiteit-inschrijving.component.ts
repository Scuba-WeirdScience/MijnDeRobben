import { Component, input, output, signal, effect, ChangeDetectionStrategy } from '@angular/core';
import { ButtonComponent } from '../../../../shared/components/design-system';
import { ToastService } from '../../../../shared/components/toast/toast.service';
import { inject } from '@angular/core';
import {
  ActiviteitenService,
  ResolvedOccurrence,
  ActiviteitRegistratieDoc,
} from '../../activiteiten.service';
import { Member } from '../../../members/services/member.service';

@Component({
  selector: 'app-activiteit-inschrijving',
  standalone: true,
  imports: [ButtonComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './activiteit-inschrijving.component.html',
})
export class ActiviteitInschrijvingComponent {
  private readonly service = inject(ActiviteitenService);
  private readonly toast = inject(ToastService);

  readonly occurrence = input.required<ResolvedOccurrence>();
  readonly mijnRegistratie = input<ActiviteitRegistratieDoc | null>(null);
  readonly kinderen = input<Member[]>([]);
  readonly kinderenRegistraties = input<Map<string, ActiviteitRegistratieDoc | null>>(new Map());
  readonly isVol = input<boolean>(false);
  readonly aantalDeelnemers = input<number>(0);
  readonly geregistreerd = output<void>();
  readonly geannuleerd = output<void>();

  readonly saving = signal(false);
  readonly aantalGasten = signal(0);
  readonly opmerking = signal('');

  // Gastenaanpassing (als al ingeschreven)
  readonly bewerkGasten = signal(false);
  readonly bewerkAantalGasten = signal(0);
  readonly bewerkOpmerking = signal('');

  // Saving state per kind (memberId  boolean)
  readonly kindSaving = signal<Map<string, boolean>>(new Map());

  constructor() {
    // Initialiseer bewerkwaarden zodra mijnRegistratie beschikbaar is
    effect(() => {
      const reg = this.mijnRegistratie();
      if (reg) {
        this.bewerkAantalGasten.set(reg.aantalGasten ?? 0);
        this.bewerkOpmerking.set(reg.opmerking ?? '');
      }
    });
  }

  onInschrijven(): void {
    const occ = this.occurrence();
    this.saving.set(true);
    this.service
      .registreer({
        activiteitId: occ.activiteitId,
        occurrenceDatum: occ.occurrenceDatum,
        aantalGasten: this.aantalGasten(),
        opmerking: this.opmerking() || null,
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.toast.success('Je bent ingeschreven.');
          this.geregistreerd.emit();
        },
        error: () => {
          this.saving.set(false);
          this.toast.error('Inschrijven mislukt. Probeer opnieuw.');
        },
      });
  }

  onAnnuleren(): void {
    const occ = this.occurrence();
    this.saving.set(true);
    this.service.annuleer(occ.activiteitId, occ.occurrenceDatum).subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.success('Inschrijving geannuleerd.');
        this.geannuleerd.emit();
      },
      error: () => {
        this.saving.set(false);
        this.toast.error('Annuleren mislukt. Probeer opnieuw.');
      },
    });
  }

  onGastenOpslaan(): void {
    const occ = this.occurrence();
    this.saving.set(true);
    this.service
      .updateGasten({
        activiteitId: occ.activiteitId,
        occurrenceDatum: occ.occurrenceDatum,
        aantalGasten: this.bewerkAantalGasten(),
        opmerking: this.bewerkOpmerking() || null,
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.bewerkGasten.set(false);
          this.toast.success('Gasten bijgewerkt.');
          this.geregistreerd.emit();
        },
        error: () => {
          this.saving.set(false);
          this.toast.error('Opslaan mislukt. Probeer opnieuw.');
        },
      });
  }

  isKindSaving(kindId: string): boolean {
    return this.kindSaving().get(kindId) ?? false;
  }

  setKindSaving(kindId: string, value: boolean): void {
    const map = new Map(this.kindSaving());
    map.set(kindId, value);
    this.kindSaving.set(map);
  }

  kindIsIngeschreven(kindId: string): boolean {
    return (this.kinderenRegistraties().get(kindId) ?? null) !== null;
  }

  onKindInschrijven(kind: Member): void {
    const occ = this.occurrence();
    this.setKindSaving(kind.id, true);
    this.service
      .registreerNamens({
        activiteitId: occ.activiteitId,
        occurrenceDatum: occ.occurrenceDatum,
        namensLidId: kind.id,
      })
      .subscribe({
        next: () => {
          this.setKindSaving(kind.id, false);
          this.toast.success(`${kind.firstName} is ingeschreven.`);
          this.geregistreerd.emit();
        },
        error: () => {
          this.setKindSaving(kind.id, false);
          this.toast.error(`Inschrijven van ${kind.firstName} mislukt.`);
        },
      });
  }

  onKindAnnuleren(kind: Member): void {
    const occ = this.occurrence();
    this.setKindSaving(kind.id, true);
    this.service.annuleerNamens(occ.activiteitId, occ.occurrenceDatum, kind.id).subscribe({
      next: () => {
        this.setKindSaving(kind.id, false);
        this.toast.success(`Inschrijving van ${kind.firstName} geannuleerd.`);
        this.geannuleerd.emit();
      },
      error: () => {
        this.setKindSaving(kind.id, false);
        this.toast.error(`Annuleren van ${kind.firstName} mislukt.`);
      },
    });
  }
}
