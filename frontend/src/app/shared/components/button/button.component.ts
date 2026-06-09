import { Component, computed, input, ChangeDetectionStrategy } from '@angular/core';
import { SpinnerComponent } from '../spinner/spinner.component';

// Tailwind v4 safelist — classes built in computed() that the scanner cannot detect.
// Do NOT remove: Tailwind scans this file as plain text and picks up these tokens.
const _TW_SAFELIST = [
  'focus:outline-none',
  'focus:ring-2',
  'focus:ring-offset-1',
  'focus:ring-scuba-500',
  'focus:ring-red-500',
  'py-1.5',
  'py-2.5',
  'gap-1.5',
  'disabled:opacity-50',
  'disabled:cursor-not-allowed',
  'hover:bg-scuba-700',
  'hover:bg-scuba-50',
  'hover:bg-red-700',
  'dark:bg-scuba-600',
  'dark:hover:bg-scuba-500',
  'dark:bg-scuba-900/20',
  'dark:text-scuba-400',
  'dark:hover:bg-scuba-900/20',
  'dark:hover:bg-red-600',
  'dark:bg-red-700',
  'text-scuba-600',
  'bg-scuba-600',
];

@Component({
  selector: 'app-button',
  standalone: true,
  imports: [SpinnerComponent],
  templateUrl: './button.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  host: { style: 'display: inline-block' },
})
export class ButtonComponent {
  readonly variant = input<'primary' | 'secondary' | 'danger' | 'ghost'>('primary');
  readonly size = input<'sm' | 'md' | 'lg'>('md');
  readonly disabled = input<boolean>(false);
  readonly loading = input<boolean>(false);
  readonly type = input<'button' | 'submit' | 'reset'>('button');

  readonly cls = computed(() => {
    const base =
      'inline-flex items-center gap-1.5 font-medium focus:outline-none focus:ring-2 focus:ring-offset-1 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed';
    const sizes: Record<string, string> = {
      sm: 'px-3 py-1.5 text-xs rounded-md',
      md: 'px-4 py-2 text-sm rounded-lg',
      lg: 'px-5 py-2.5 text-base rounded-lg',
    };
    const variants: Record<string, string> = {
      primary:
        'bg-scuba-600 text-white hover:bg-scuba-700 focus:ring-scuba-500 dark:bg-scuba-600 dark:hover:bg-scuba-500',
      secondary:
        'bg-white text-gray-700 border border-gray-300 hover:bg-scuba-50 focus:ring-scuba-500 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-scuba-900/20',
      danger:
        'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 dark:bg-red-700 dark:hover:bg-red-600',
      ghost:
        'bg-transparent text-scuba-600 hover:bg-scuba-50 focus:ring-scuba-500 dark:text-scuba-400 dark:hover:bg-scuba-900/20',
    };
    return [base, sizes[this.size()], variants[this.variant()]].join(' ');
  });
}
