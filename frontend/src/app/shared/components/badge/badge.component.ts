import { Component, computed, input, ChangeDetectionStrategy } from '@angular/core';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';

const _TW_SAFELIST = [
  'bg-gray-100', 'text-gray-700', 'dark:bg-gray-700', 'dark:text-gray-300',
  'bg-green-100', 'text-green-700', 'dark:bg-green-900/30', 'dark:text-green-300',
  'bg-yellow-100', 'text-yellow-700', 'dark:bg-yellow-900/30', 'dark:text-yellow-300',
  'bg-red-100', 'text-red-700', 'dark:bg-red-900/30', 'dark:text-red-300',
  'bg-blue-100', 'text-blue-700', 'dark:bg-blue-900/30', 'dark:text-blue-300',
  'bg-scuba-100', 'text-scuba-700', 'dark:bg-scuba-900/30', 'dark:text-scuba-300',
  'bg-gray-500', 'bg-green-500', 'bg-yellow-500', 'bg-red-500', 'bg-blue-500', 'bg-scuba-500',
];

@Component({
  selector: 'app-badge',
  standalone: true,
  imports: [...HlmBadgeImports],
  templateUrl: './badge.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display: inline-flex; align-items: center;' },
})
export class BadgeComponent {
  readonly variant = input<'default' | 'success' | 'warning' | 'danger' | 'info' | 'primary'>('default');
  readonly size = input<'sm' | 'md'>('md');
  readonly pulse = input<boolean>(false);

  /** Map DSC variant → spartan variant for base structure. */
  readonly spartanVariant = computed<'default' | 'secondary' | 'outline' | 'destructive' | null>(() => {
    const map: Record<string, 'default' | 'secondary' | 'outline' | 'destructive' | null> = {
      default: 'default',
      primary: 'default',
      success: 'default',
      warning: 'default',
      danger: 'destructive',
      info: 'default',
    };
    return map[this.variant()] ?? 'default';
  });

  /** DSC-specific colour overrides for variants spartan doesn't have. */
  readonly dscCls = computed(() => {
    const base = 'inline-flex items-center gap-1.5 font-medium text-xs';
    const sizes: Record<string, string> = {
      sm: 'px-2 py-0.5 rounded',
      md: 'px-2.5 py-1 rounded-full',
    };
    const dscColors: Record<string, string> = {
      default: '',
      primary: '',
      success: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
      warning: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
      danger: '',
      info: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    };
    return [base, sizes[this.size()], dscColors[this.variant()]].join(' ');
  });

  readonly pulseCls = computed(() => {
    const colors: Record<string, string> = {
      default: 'bg-gray-500',
      success: 'bg-green-500',
      warning: 'bg-yellow-500',
      danger: 'bg-red-500',
      info: 'bg-blue-500',
      primary: 'bg-scuba-500',
    };
    return colors[this.variant()];
  });
}
