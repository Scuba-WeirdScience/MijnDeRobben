import { Component, computed, input, output, ChangeDetectionStrategy } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideX, lucideXCircle, lucideTriangleAlert, lucideCircleCheck, lucideInfo } from '@ng-icons/lucide';
import { HlmAlertImports } from '@spartan-ng/helm/alert';

const _TW_SAFELIST = [
  'border-red-200', 'dark:border-red-800', 'text-red-800', 'dark:text-red-200',
  'border-yellow-200', 'dark:border-yellow-800', 'text-yellow-800', 'dark:text-yellow-200',
  'border-green-200', 'dark:border-green-800', 'text-green-800', 'dark:text-green-200',
  'border-blue-200', 'dark:border-blue-800', 'text-blue-800', 'dark:text-blue-200',
  'bg-red-50', 'dark:bg-red-900/20',
  'bg-yellow-50', 'dark:bg-yellow-900/20',
  'bg-green-50', 'dark:bg-green-900/30',
  'bg-blue-50', 'dark:bg-blue-900/20',
];

@Component({
  selector: 'app-alert',
  standalone: true,
  imports: [...HlmAlertImports, NgIcon],
  providers: [provideIcons({ lucideX, lucideXCircle, lucideTriangleAlert, lucideCircleCheck, lucideInfo })],
  templateUrl: './alert.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display: block' },
})
export class AlertComponent {
  readonly variant = input<'error' | 'warning' | 'success' | 'info'>('info');
  readonly dismissible = input<boolean>(false);
  readonly dismissed = output<void>();

  readonly spartanVariant = computed(() =>
    this.variant() === 'error' ? 'destructive' : 'default',
  );

  readonly dscColorCls = computed(() => {
    const variants: Record<string, string> = {
      error:
        'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200',
      warning:
        'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200',
      success:
        'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200',
      info: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200',
    };
    return variants[this.variant()] ?? '';
  });

  readonly iconName = computed(() => {
    const icons: Record<string, string> = {
      error: 'lucideXCircle',
      warning: 'lucideTriangleAlert',
      success: 'lucideCircleCheck',
      info: 'lucideInfo',
    };
    return icons[this.variant()];
  });
}
