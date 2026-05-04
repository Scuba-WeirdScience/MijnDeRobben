import { Component } from '@angular/core';

/**
 * DSC PageContainer component.
 *
 * Standaard pagina-wrapper met gecentreerde max-breedte en consistente padding.
 * Gebruik dit in elke full-page list- of detailweergave.
 *
 * Usage:
 * ```html
 * <app-page-container>
 *   <app-page-header title="Leden" />
 *   ...
 * </app-page-container>
 * ```
 */
@Component({
  selector: 'app-page-container',
  standalone: true,
  template: `
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <ng-content />
    </div>
  `,
  host: { style: 'display: block' },
})
export class PageContainerComponent {}
