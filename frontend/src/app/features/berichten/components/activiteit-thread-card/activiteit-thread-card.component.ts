import {
  Component,
  computed,
  inject,
  signal,
  effect,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThreadsService } from '../../services/threads.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { ToastService } from '../../../../shared/components/toast/toast.service';
import {
  ButtonComponent,
  SpinnerComponent,
  ConfirmDialogComponent,
} from '../../../../shared/components/design-system';
import { ActiviteitRegistratieDoc } from '../../../../core/models/firestore-types';

// Tailwind safelist for dynamic classes
const _TW_SAFELIST = [
  'bg-green-50',
  'dark:bg-green-900/20',
  'border-green-200',
  'dark:border-green-700',
  'text-green-700',
  'dark:text-green-400',
  'text-green-800',
  'dark:text-green-300',
  'bg-amber-50',
  'dark:bg-amber-900/20',
  'border-amber-200',
  'dark:border-amber-700',
  'text-amber-700',
  'dark:text-amber-400',
];

@Component({
  selector: 'app-activiteit-thread-card',
  standalone: true,
  imports: [CommonModule, ButtonComponent, SpinnerComponent, ConfirmDialogComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './activiteit-thread-card.component.html',
})
export class ActiviteitThreadCardComponent {
  protected readonly threadsService = inject(ThreadsService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  readonly saving = signal(false);
  readonly resetting = signal(false);
  readonly confirmReset = signal(false);
  readonly aantalGasten = signal(0);
  readonly reg = computed(() => this.mijnReg());

  constructor() {
    // Sync aantalGasten from existing registration when it loads
    effect(() => {
      const r = this.mijnReg();
      if (r && (r.status === 'aangemeld' || r.status === 'aanwezig')) {
        this.aantalGasten.set(r.aantalGasten ?? 0);
      }
    });
  }

  readonly act = computed(() => this.threadsService.linkedActiviteit());
  readonly occ = computed(() => this.threadsService.upcomingOccurrence());
  readonly mijnReg = computed(() => this.threadsService.mijnRegistratie());
  readonly deelnemers = computed(() => this.threadsService.occurrenceRegistraties());

  readonly aangemeldDeelnemers = computed(() =>
    this.deelnemers().filter((r) => r.status === 'aangemeld' || r.status === 'aanwezig')
  );

  readonly visible = computed(() => {
    const act = this.act();
    const occ = this.occ();
    return !!(act?.inschrijvingenActief && occ);
  });

  readonly loading = computed(() => this.mijnReg() === undefined);

  readonly status = computed((): ActiviteitRegistratieDoc['status'] | null => {
    const r = this.mijnReg();
    if (r === undefined || r === null) return null;
    return r.status;
  });

  /** Toon gastenveld enkel als ingeschreven (aangemeld/aanwezig) en gasten:true op activiteit. */
  readonly toonGasten = computed(() => {
    const act = this.act();
    const s = this.status();
    return !!(act?.gasten && (s === 'aangemeld' || s === 'aanwezig'));
  });

  /** Kan niet al ingeschreven zijn OF nog geen status. */
  readonly kanNietTonen = computed(() => {
    const s = this.status();
    return s === null || s === 'aangemeld' || s === 'aanwezig';
  });

  readonly isAdminOfOrganisator = computed(() => {
    if (this.auth.hasAnyRole(['Beheer', 'Bestuur'])) return true;
    const act = this.act();
    const uid = this.auth.currentUser()?.uid;
    if (!act || !uid) return false;
    // organisatorLeden zijn member IDs, niet UIDs — we kunnen enkel UID matchen via
    // de organisatorGroepId-check (niet beschikbaar frontend). Valt terug op admin-check.
    return false;
  });

  getInitialen(naam: string): string {
    return naam
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((n) => n.charAt(0).toUpperCase())
      .join('');
  }

  async onInschrijven(): Promise<void> {
    this.saving.set(true);
    try {
      await this.threadsService.registreer(this.aantalGasten());
      this.toast.success('Je bent ingeschreven!');
    } catch {
      this.toast.error('Inschrijven mislukt. Probeer opnieuw.');
    } finally {
      this.saving.set(false);
    }
  }

  async onUpdateGasten(): Promise<void> {
    this.saving.set(true);
    try {
      await this.threadsService.registreer(this.aantalGasten());
      this.toast.success('Aantal gasten opgeslagen.');
    } catch {
      this.toast.error('Opslaan mislukt. Probeer opnieuw.');
    } finally {
      this.saving.set(false);
    }
  }

  async onMeldAfwezig(): Promise<void> {
    this.saving.set(true);
    try {
      await this.threadsService.meldAfwezig();
      this.toast.success('Je hebt aangegeven er niet bij te zijn.');
    } catch {
      this.toast.error('Afmelden mislukt. Probeer opnieuw.');
    } finally {
      this.saving.set(false);
    }
  }

  async onAnnuleer(): Promise<void> {
    this.saving.set(true);
    try {
      await this.threadsService.annuleerInschrijving();
      this.toast.success('Inschrijving geannuleerd.');
    } catch {
      this.toast.error('Annuleren mislukt. Probeer opnieuw.');
    } finally {
      this.saving.set(false);
    }
  }

  async onResetBevestigd(): Promise<void> {
    this.confirmReset.set(false);
    this.resetting.set(true);
    try {
      const res = await this.threadsService.resetInschrijvingen();
      this.aantalGasten.set(0);
      this.toast.success(`Inschrijvingen gereset (${res.deleted} verwijderd).`);
    } catch {
      this.toast.error('Reset mislukt. Probeer opnieuw.');
    } finally {
      this.resetting.set(false);
    }
  }
}
