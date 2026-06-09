import { Component, input, computed, ChangeDetectionStrategy } from '@angular/core';
import { format, parseISO } from 'date-fns';
import { nl } from 'date-fns/locale';
import { EmptyStateComponent } from '../../../../shared/components/design-system';
import { ResolvedOccurrence } from '../../activiteiten.service';
import { ActiviteitKaartComponent } from './activiteit-kaart.component';

interface MaandGroep {
  label: string;
  occurrences: ResolvedOccurrence[];
}

@Component({
  selector: 'app-activiteiten-agenda',
  standalone: true,
  imports: [EmptyStateComponent, ActiviteitKaartComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './activiteiten-agenda.component.html',
})
export class ActiviteitenAgendaComponent {
  readonly occurrences = input.required<ResolvedOccurrence[]>();

  readonly maandGroepen = computed((): MaandGroep[] => {
    const map = new Map<string, ResolvedOccurrence[]>();
    for (const occ of this.occurrences()) {
      try {
        const label = format(parseISO(occ.startDatumTijd), 'MMMM yyyy', { locale: nl });
        if (!map.has(label)) map.set(label, []);
        map.get(label)!.push(occ);
      } catch {
        // skip invalid dates
      }
    }
    return Array.from(map.entries()).map(([label, items]) => ({ label, occurrences: items }));
  });
}
