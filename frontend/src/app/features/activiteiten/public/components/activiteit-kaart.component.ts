import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { format, parseISO } from 'date-fns';
import { nl } from 'date-fns/locale';
import { BadgeComponent } from '../../../../shared/components/design-system';
import { ResolvedOccurrence } from '../../activiteiten.service';

@Component({
  selector: 'app-activiteit-kaart',
  standalone: true,
  imports: [RouterLink, BadgeComponent],
  templateUrl: './activiteit-kaart.component.html',
})
export class ActiviteitKaartComponent {
  readonly occurrence = input.required<ResolvedOccurrence>();

  formatDatum(iso: string): string {
    try {
      return format(parseISO(iso), 'dd MMM yyyy HH:mm', { locale: nl });
    } catch {
      return iso;
    }
  }

  get detailUrl(): string[] {
    return ['/activiteiten', this.occurrence().activiteitId];
  }

  get queryParams(): Record<string, string> {
    return { datum: this.occurrence().occurrenceDatum };
  }
}
