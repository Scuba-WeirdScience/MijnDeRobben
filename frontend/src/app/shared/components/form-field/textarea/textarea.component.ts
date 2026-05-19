import { Component, computed, input, model } from '@angular/core';
import { FORM_FIELD } from '../form-field.token';

@Component({
  selector: 'app-textarea',
  standalone: true,
  imports: [],
  viewProviders: [{ provide: FORM_FIELD, useExisting: TextareaComponent }],
  templateUrl: './textarea.component.html',
  host: { style: 'display: block' },
})
export class TextareaComponent {
  readonly value       = model<string>('');
  readonly errors      = input<readonly { message?: string }[]>([]);
  readonly disabled    = input<boolean>(false);
  readonly required    = input<boolean>(false);
  readonly invalid     = input<boolean>(false);
  readonly maxLength   = input<number | undefined>(undefined);
  readonly placeholder = input<string>('');
  readonly rows        = input<number>(3);

  readonly cls = computed(() =>
    [
      'w-full rounded-lg border px-3 py-2 text-sm resize-none',
      'bg-white dark:bg-gray-800 text-gray-900 dark:text-white',
      'placeholder:text-gray-400 dark:placeholder:text-gray-500',
      'focus:outline-none focus:ring-2 focus:border-transparent transition-colors duration-150',
      'disabled:opacity-50 disabled:cursor-not-allowed',
      this.invalid()
        ? 'border-red-500 dark:border-red-400 focus:ring-red-500'
        : 'border-gray-300 dark:border-gray-600 focus:ring-scuba-500',
    ].join(' ')
  );

  onInput(e: Event): void { this.value.set((e.target as HTMLTextAreaElement).value); }
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  onBlur(): void {}
}
