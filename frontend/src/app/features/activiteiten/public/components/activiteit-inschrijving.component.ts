import { Component, input, output, signal, effect } from '@angular/core';
import { ButtonComponent } from '../../../../shared/components/design-system';
import { ToastService } from '../../../../shared/components/toast/toast.service';
import { inject } from '@angular/core';
import { ActiviteitenService, ResolvedOccurrence, ActiviteitRegistratieDoc } from '../../activiteiten.service';

@Component({
  selector: 'app-activiteit-inschrijving',
  standalone: true,
  imports: [ButtonComponent],
  templateUrl: './activiteit-inschrijving.component.html',
})
export class ActiviteitInschrijvingComponent {
  private readonly service = inject(ActiviteitenService);
  private readonly toast = inject(ToastService);

  readonly occurrence = input.required<ResolvedOccurrence>();
  readonly mijnRegistratie = input<ActiviteitRegistratieDoc | null>(null);
  readonly geregistreerd = output<void>();
  readonly geannuleerd = output<void>();

  readonly saving = signal(false);
  readonly aantalGasten = signal(0);
  readonly opmerking = signal('');

  // Gastenaanpassing (als al ingeschreven)
  readonly bewerkGasten = signal(false);
  readonly bewerkAantalGasten = signal(0);
  readonly bewerkOpmerking = signal('');

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
    this.service.registreer({
      activiteitId: occ.activiteitId,
      occurrenceDatum: occ.occurrenceDatum,
      aantalGasten: this.aantalGasten(),
      opmerking: this.opmerking() || null,
    }).subscribe({
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
    this.service.updateGasten({
      activiteitId: occ.activiteitId,
      occurrenceDatum: occ.occurrenceDatum,
      aantalGasten: this.bewerkAantalGasten(),
      opmerking: this.bewerkOpmerking() || null,
    }).subscribe({
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
}
