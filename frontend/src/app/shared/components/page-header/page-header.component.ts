import { Component, input } from '@angular/core';

/**
 * DSC PageHeader component.
 *
 * Standaard paginahoofding met titel, optionele ondertitel en een
 * [actions] named slot voor knoppen rechts.
 *
 * Usage:
 * ```html
 * <app-page-header title="Materiaal beheren">
 *   <div actions>
 *     <app-button (click)="addType()">+ Type toevoegen</app-button>
 *   </div>
 * </app-page-header>
 * ```
 */
@Component({
  selector: 'app-page-header',
  standalone: true,
  template: `
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ title() }}</h1>
        @if (subtitle()) {
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">{{ subtitle() }}</p>
        }
      </div>
      <ng-content select="[actions]" />
    </div>
  `,
  host: { style: 'display: block' },
})
export class PageHeaderComponent {
  readonly title    = input.required<string>();
  readonly subtitle = input<string | undefined>(undefined);
}
