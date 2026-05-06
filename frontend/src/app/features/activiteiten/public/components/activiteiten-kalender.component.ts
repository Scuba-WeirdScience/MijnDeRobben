import { Component, input, output, computed, signal } from '@angular/core';
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

@Component({
  selector: 'app-activiteiten-kalender',
  standalone: true,
  imports: [NgClass, ButtonComponent, ActiviteitKaartComponent],
  templateUrl: './activiteiten-kalender.component.html',
})
export class ActiviteitenKalenderComponent {
  readonly occurrences = input.required<ResolvedOccurrence[]>();
  readonly maand = input.required<Date>();
  readonly maandGewijzigd = output<Date>();
  readonly occurrenceGeselecteerd = output<ResolvedOccurrence>();

  readonly geselecteerdeDag = signal<Date | null>(null);

  readonly dagNamen = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'];

  readonly kalenderDagen = computed(() => {
    const start = startOfMonth(this.maand());
    const end = endOfMonth(this.maand());
    const days = eachDayOfInterval({ start, end });

    // Add leading empty cells for the start of the week (Mon=0)
    const firstDow = (getDay(start) + 6) % 7; // convert Sun=0 to Mon=0
    const leading: null[] = Array(firstDow).fill(null);

    return [...leading, ...days] as (Date | null)[];
  });

  readonly geselecteerdeDagOccurrences = computed((): ResolvedOccurrence[] => {
    const dag = this.geselecteerdeDag();
    if (!dag) return [];
    return this.occurrences().filter(occ => {
      try {
        return isSameDay(parseISO(occ.startDatumTijd), dag);
      } catch {
        return false;
      }
    });
  });

  dagHeeftOccurrences(dag: Date): boolean {
    return this.occurrences().some(occ => {
      try {
        return isSameDay(parseISO(occ.startDatumTijd), dag);
      } catch {
        return false;
      }
    });
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
