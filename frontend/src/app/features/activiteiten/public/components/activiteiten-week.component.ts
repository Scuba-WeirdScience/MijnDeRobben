import { Component, input, output, computed, ChangeDetectionStrategy } from '@angular/core';
import { NgClass } from '@angular/common';
import { RouterLink } from '@angular/router';
import {
  format,
  parseISO,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  isToday,
  addWeeks,
  subWeeks,
} from 'date-fns';
import { nl } from 'date-fns/locale';
import { ButtonComponent } from '../../../../shared/components/design-system';
import { ResolvedOccurrence } from '../../activiteiten.service';

// In the component .ts file — do NOT remove
const _TW_SAFELIST = [
  'bg-scuba-100',
  'text-scuba-700',
  'dark:bg-scuba-900/40',
  'dark:text-scuba-300',
  'hover:bg-scuba-200',
  'dark:hover:bg-scuba-800/40',
  'bg-scuba-50',
  'dark:bg-scuba-900/10',
  'text-scuba-600',
  'dark:text-scuba-400',
];

@Component({
  selector: 'app-activiteiten-week',
  standalone: true,
  imports: [NgClass, ButtonComponent, RouterLink],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './activiteiten-week.component.html',
})
export class ActiviteitenWeekComponent {
  readonly occurrences = input.required<ResolvedOccurrence[]>();
  readonly week = input.required<Date>();
  readonly weekGewijzigd = output<Date>();

  readonly dagNamen = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'];

  readonly weekDagen = computed(() => {
    const start = startOfWeek(this.week(), { weekStartsOn: 1 });
    const end = endOfWeek(this.week(), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  });

  readonly weekLabel = computed(() => {
    const days = this.weekDagen();
    const start = days[0];
    const end = days[6];
    if (start.getMonth() === end.getMonth()) {
      return format(start, 'd', { locale: nl }) + '–' + format(end, 'd MMMM yyyy', { locale: nl });
    }
    return (
      format(start, 'd MMM', { locale: nl }) + ' – ' + format(end, 'd MMM yyyy', { locale: nl })
    );
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

  isDagVandaag(dag: Date): boolean {
    return isToday(dag);
  }

  dagNummer(dag: Date): string {
    return format(dag, 'd', { locale: nl });
  }

  dagNaam(dag: Date): string {
    return format(dag, 'EEE', { locale: nl });
  }

  tijdLabel(occ: ResolvedOccurrence): string {
    try {
      return format(parseISO(occ.startDatumTijd), 'HH:mm', { locale: nl });
    } catch {
      return '';
    }
  }

  detailUrl(occ: ResolvedOccurrence): string[] {
    return ['/activiteiten', occ.activiteitId];
  }

  queryParams(occ: ResolvedOccurrence): Record<string, string> {
    return { datum: occ.occurrenceDatum };
  }

  vorigeWeek(): void {
    this.weekGewijzigd.emit(subWeeks(this.week(), 1));
  }

  volgendeWeek(): void {
    this.weekGewijzigd.emit(addWeeks(this.week(), 1));
  }
}
