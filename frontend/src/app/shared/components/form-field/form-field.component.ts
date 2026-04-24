import { Component, computed, input } from '@angular/core';
import { LucideTriangleAlert } from '../../lucide-icons';

// Tailwind v4 safelist — classes built in computed() that the scanner cannot detect.
// Do NOT remove: Tailwind scans this file as plain text and picks up these tokens.
const _TW_SAFELIST = [
  'mb-1.5', 'space-y-1.5',
  'text-red-600', 'dark:text-red-400',
  'text-gray-700', 'dark:text-gray-300',
];

@Component({
  selector: 'app-form-field',
  standalone: true,
  imports: [LucideTriangleAlert],
  templateUrl: './form-field.component.html',
  host: { style: 'display: block' },
})
export class FormFieldComponent {
  label    = input<string>('');
  required = input<boolean>(false);
  hint     = input<string>('');
  error    = input<string | null>(null);

  readonly labelCls = computed(() =>
    this.error()
      ? 'block text-sm font-medium mb-1.5 text-red-600 dark:text-red-400'
      : 'block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300'
  );
}
