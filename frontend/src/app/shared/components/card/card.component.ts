import { Component, input, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-card',
  standalone: true,
  template: `<ng-content />`,
  changeDetection: ChangeDetectionStrategy.Eager,
  host: {
    class:
      'block bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm',
    '[class.p-5]': 'padding()',
  },
})
export class CardComponent {
  readonly padding = input<boolean>(true);
}
