import { Component, computed, input, ChangeDetectionStrategy } from '@angular/core';

const EMPTY_STATE_ICONS: Record<string, string> = {
  box: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
  users:
    'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
  document:
    'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  folder: 'M3 7a2 2 0 012-2h4l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z',
};

/**
 * DSC EmptyState component.
 *
 * Usage:
 * ```html
 * <app-empty-state message="Nog geen materialen.">
 *   <app-button (click)="add()">+ Toevoegen</app-button>
 * </app-empty-state>
 * <app-empty-state icon="users" message="Geen leden gevonden." />
 * ```
 */
@Component({
  selector: 'app-empty-state',
  standalone: true,
  template: `
    <div class="flex flex-col items-center justify-center py-12 text-center">
      @if (icon() !== 'none') {
      <svg
        class="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600 mb-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="1.5"
          [attr.d]="iconPath()"
        />
      </svg>
      }
      <p class="text-sm text-gray-500 dark:text-gray-400">{{ message() }}</p>
      <div class="mt-4">
        <ng-content />
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  host: { style: 'display: block' },
})
export class EmptyStateComponent {
  readonly message = input.required<string>();
  readonly icon = input<'box' | 'users' | 'document' | 'folder' | 'none'>('box');

  readonly iconPath = computed(() => EMPTY_STATE_ICONS[this.icon()] ?? EMPTY_STATE_ICONS['box']);
}
