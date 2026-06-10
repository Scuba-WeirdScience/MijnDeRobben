import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { HlmCardImports } from '@spartan-ng/helm/card';

@Component({
  selector: 'app-card',
  standalone: true,
  imports: [...HlmCardImports],
  templateUrl: './card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CardComponent {
  readonly padding = input<boolean>(true);
}
