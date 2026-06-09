import { Component, input, output, computed, signal, ChangeDetectionStrategy } from '@angular/core';
import { NgClass } from '@angular/common';
import {
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  isSameDay,
  isSameMonth,
  isToday,
  addMonths,
  subMonths,
} from 'date-fns';
import { nl } from 'date-fns/locale';
import { ButtonComponent } from '../../../../shared/components/design-system';
import { ResolvedOccurrence } from '../../activiteiten.service';
import { ActiviteitKaartComponent } from './activiteit-kaart.component';

// In the component .ts file — do NOT remove
const _TW_SAFELIST = [
  'bg-scuba-100',
  'text-scuba-700',
  'dark:bg-scuba-900/40',
  'dark:text-scuba-300',
  'hover:bg-scuba-200',
  'dark:hover:bg-scuba-800/40',
  'text-scuba-500',
  'dark:text-scuba-400',
];

const MAX_CHIPS = 2;

@Component({
  selector: 'app-activiteiten-kalender',
  standalone: true,
  imports: [NgClass, ButtonComponent, ActiviteitKaartComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './activiteiten-kalender.component.html',
})
export class ActiviteitenKalenderComponent {
  readonly occurrences = input.required<ResolvedOccurrence[]>();
  readonly maand = input.required<Date>();
  readonly maandGewijzigd = output<Date>();
  readonly occurrenceGeselecteerd = output<ResolvedOccurrence>();

  readonly geselecteerdeDag = signal<Date | null>(null);

  readonly dagNamen = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'];

  readonly maxChips = MAX_CHIPS;

  readonly kalenderDagen = computed(() => {
    const start = startOfMonth(this.maand());
    const end = endOfMonth(this.maand());
    const days = eachDayOfInterval({ start, end });

    // Add leading empty cells for the start of the week (Mon=0)
    const firstDow = (getDay(start) + 6) % 7;
    const leading: null[] = Array(firstDow).fill(null);

    return [...leading, ...days] as (Date | null)[];
  });

  readonly geselecteerdeDagOccurrences = computed((): ResolvedOccurrence[] => {
    const dag = this.geselecteerdeDag();
    if (!dag) return [];
    return this.occurrencesVoorDag(dag);
  });

  occurrencesVoorDag(dag: Date): ResolvedOccurrence[] {
    return this.occurrences().filter((occ) => {
      try {
        return isSameDay(parseISO(occ.startDatumTijd), dag);
      } catch {
        return false;
      }
    });
  }

  chipsVoorDag(dag: Date): ResolvedOccurrence[] {
    return this.occurrencesVoorDag(dag).slice(0, MAX_CHIPS);
  }

  meerAantalVoorDag(dag: Date): number {
    const total = this.occurrencesVoorDag(dag).length;
    return total > MAX_CHIPS ? total - MAX_CHIPS : 0;
  }

  dagHeeftOccurrences(dag: Date): boolean {
    return this.occurrencesVoorDag(dag).length > 0;
  }

  isHuidigeMaand(dag: Date): boolean {
    return isSameMonth(dag, this.maand());
  }

  isDagVandaag(dag: Date): boolean {
    return isToday(dag);
  }

  isGeselecteerd(dag: Date): boolean {
    const sel = this.geselecteerdeDag();
    return sel ? isSameDay(dag, sel) : false;
  }

  selecteerDag(dag: Date): void {
    if (this.dagHeeftOccurrences(dag)) {
      this.geselecteerdeDag.set(dag);
    }
  }

  detailUrl(occ: ResolvedOccurrence): string[] {
    return ['/activiteiten', occ.activiteitId];
  }

  queryParams(occ: ResolvedOccurrence): Record<string, string> {
    return { datum: occ.occurrenceDatum };
  }

  tijdLabel(occ: ResolvedOccurrence): string {
    try {
      return format(parseISO(occ.startDatumTijd), 'HH:mm', { locale: nl });
    } catch {
      return '';
    }
  }

  vorigeMaand(): void {
    this.maandGewijzigd.emit(subMonths(this.maand(), 1));
    this.geselecteerdeDag.set(null);
  }

  volgendeMaand(): void {
    this.maandGewijzigd.emit(addMonths(this.maand(), 1));
    this.geselecteerdeDag.set(null);
  }

  maandLabel(): string {
    return format(this.maand(), 'MMMM yyyy', { locale: nl });
  }
}
