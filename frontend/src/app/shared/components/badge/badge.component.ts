import { Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-badge',
  standalone: true,
  templateUrl: './badge.component.html',
  host: { style: 'display: inline-flex; align-items: center;' },
})
export class BadgeComponent {
  readonly variant = input<'default' | 'success' | 'warning' | 'danger' | 'info' | 'primary'>('default');
  readonly size    = input<'sm' | 'md'>('md');
  readonly pulse   = input<boolean>(false);

  readonly cls = computed(() => {
    const base = 'inline-flex items-center gap-1.5 font-medium text-xs';
    const sizes: Record<string, string> = {
      sm: 'px-2 py-0.5 rounded',
      md: 'px-2.5 py-1 rounded-full',
    };
    const variants: Record<string, string> = {
      default: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
      success: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
      warning: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
      danger:  'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
      info:    'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
      primary: 'bg-scuba-100 text-scuba-700 dark:bg-scuba-900/30 dark:text-scuba-300',
    };
    return [base, sizes[this.size()], variants[this.variant()]].join(' ');
  });

  readonly pulseCls = computed(() => {
    const colors: Record<string, string> = {
      default: 'bg-gray-500',
      success: 'bg-green-500',
      warning: 'bg-yellow-500',
      danger:  'bg-red-500',
      info:    'bg-blue-500',
      primary: 'bg-scuba-500',
    };
    return colors[this.variant()];
  });
}
