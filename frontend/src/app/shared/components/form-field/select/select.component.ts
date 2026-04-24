import { Component, computed, input, model } from '@angular/core';
import { FORM_FIELD } from '../form-field.token';

// Tailwind v4 safelist — classes built in computed() that the scanner cannot detect.
// Do NOT remove: Tailwind scans this file as plain text and picks up these tokens.
const _TW_SAFELIST = [
  'focus:outline-none', 'focus:ring-2', 'focus:border-transparent',
  'focus:ring-scuba-500', 'focus:ring-red-500',
  'border-red-500', 'border-gray-300',
  'dark:border-red-400', 'dark:border-gray-600',
];

@Component({
  selector: 'app-select',
  standalone: true,
  imports: [],
  viewProviders: [{ provide: FORM_FIELD, useExisting: SelectComponent }],
  templateUrl: './select.component.html',
  host: { style: 'display: block' },
})
export class SelectComponent {
  readonly value    = model<string>('');
  readonly errors   = input<readonly { message?: string }[]>([]);
  readonly disabled = input<boolean>(false);
  readonly required = input<boolean>(false);
  readonly invalid  = input<boolean>(false);

  readonly cls = computed(() =>
    [
      'w-full rounded-lg border px-3 py-2 text-sm',
      'bg-white dark:bg-gray-800 text-gray-900 dark:text-white',
      'focus:outline-none focus:ring-2 focus:border-transparent transition-colors duration-150',
      'disabled:opacity-50 disabled:cursor-not-allowed',
      this.invalid()
        ? 'border-red-500 dark:border-red-400 focus:ring-red-500'
        : 'border-gray-300 dark:border-gray-600 focus:ring-scuba-500',
    ].join(' ')
  );

  onChange(e: Event): void { this.value.set((e.target as HTMLSelectElement).value); }
  onBlur(): void {}
}
