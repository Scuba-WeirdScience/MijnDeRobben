import { Component, computed, input, output } from '@angular/core';
import {
  LucideDynamicIcon,
  LucideX,
  LucideXCircle,
  LucideTriangleAlert,
  LucideCircleCheck,
  LucideInfo,
} from '../../lucide-icons';

@Component({
  selector: 'app-alert',
  standalone: true,
  imports: [LucideDynamicIcon, LucideX],
  templateUrl: './alert.component.html',
  host: { style: 'display: block' },
})
export class AlertComponent {
  readonly variant     = input<'error' | 'warning' | 'success' | 'info'>('info');
  readonly dismissible = input<boolean>(false);
  readonly dismissed   = output<void>();

  readonly containerCls = computed(() => {
    const base = 'flex gap-3 rounded-lg border p-4';
    const variants: Record<string, string> = {
      error:   'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200',
      warning: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200',
      success: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200',
      info:    'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200',
    };
    return [base, variants[this.variant()]].join(' ');
  });

  readonly icon = computed(() => ({
    error:   LucideXCircle,
    warning: LucideTriangleAlert,
    success: LucideCircleCheck,
    info:    LucideInfo,
  }[this.variant()]));
}
