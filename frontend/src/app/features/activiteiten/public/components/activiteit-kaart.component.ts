import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BadgeComponent } from '../../../../shared/components/design-system';
import { LocaleDateTimePipe } from '../../../../shared/pipes/locale-datetime.pipe';
import { ResolvedOccurrence } from '../../activiteiten.service';

@Component({
  selector: 'app-activiteit-kaart',
  standalone: true,
  imports: [RouterLink, BadgeComponent, LocaleDateTimePipe],
  templateUrl: './activiteit-kaart.component.html',
})
export class ActiviteitKaartComponent {
  readonly occurrence = input.required<ResolvedOccurrence>();

  get detailUrl(): string[] {
    return ['/activiteiten', this.occurrence().activiteitId];
  }

  get queryParams(): Record<string, string> {
    return { datum: this.occurrence().occurrenceDatum };
  }
}
