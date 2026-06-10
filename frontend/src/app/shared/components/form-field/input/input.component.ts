import { Component, computed, input, model, ChangeDetectionStrategy } from '@angular/core';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { FORM_FIELD } from '../form-field.token';

// Tailwind v4 safelist — classes built in computed() that the scanner cannot detect.
// Do NOT remove: Tailwind scans this file as plain text and picks up these tokens.
const _TW_SAFELIST = [
  'focus:outline-none',
  'focus:ring-2',
  'focus:border-transparent',
  'focus:ring-scuba-500',
  'focus:ring-red-500',
  'border-red-500',
  'border-gray-300',
  'dark:border-red-400',
  'dark:border-gray-600',
  'placeholder:text-gray-400',
  'dark:placeholder:text-gray-500',
];

@Component({
  selector: 'app-input',
  standalone: true,
  imports: [...HlmInputImports],
  viewProviders: [{ provide: FORM_FIELD, useExisting: InputComponent }],
  templateUrl: './input.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  host: { style: 'display: block' },
})
export class InputComponent {
  readonly value = model<string>('');
  readonly errors = input<readonly { message?: string }[]>([]);
  readonly disabled = input<boolean>(false);
  readonly required = input<boolean>(false);
  readonly invalid = input<boolean>(false);
  readonly maxLength = input<number | undefined>(undefined);
  readonly minLength = input<number | undefined>(undefined);
  readonly min = input<number | string | undefined>(undefined);
  readonly max = input<number | string | undefined>(undefined);
  readonly type = input<
    'text' | 'email' | 'password' | 'number' | 'search' | 'tel' | 'url' | 'date'
  >('text');
  readonly placeholder = input<string>('');
  readonly autocomplete = input<string>('off');

  readonly cls = computed(() =>
    [
      'w-full rounded-lg border px-3 py-2 text-sm',
      'bg-white dark:bg-gray-800 text-gray-900 dark:text-white',
      'placeholder:text-gray-400 dark:placeholder:text-gray-500',
      'focus:outline-none focus:ring-2 focus:border-transparent transition-colors duration-150',
      'disabled:opacity-50 disabled:cursor-not-allowed',
      this.invalid()
        ? 'border-red-500 dark:border-red-400 focus:ring-red-500'
        : 'border-gray-300 dark:border-gray-600 focus:ring-scuba-500',
    ].join(' ')
  );

  onInput(e: Event): void {
    this.value.set((e.target as HTMLInputElement).value);
  }
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  onBlur(): void {}
}
