import { Component, computed, input, ChangeDetectionStrategy } from '@angular/core';
import { HlmAvatarImports } from '@spartan-ng/helm/avatar';

const _TW_SAFELIST = ['w-7', 'h-7'];

@Component({
  selector: 'app-avatar',
  standalone: true,
  imports: [...HlmAvatarImports],
  templateUrl: './avatar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AvatarComponent {
  readonly src = input<string | null>(null);
  readonly alt = input<string>('');
  readonly initials = input.required<string>();
  readonly bgColor = input<string>('hsl(200, 55%, 45%)');
  readonly size = input<'xs' | 'sm' | 'md' | 'lg'>('sm');

  readonly spartanSize = computed(() => {
    const map: Record<string, 'sm' | 'default' | 'lg'> = {
      xs: 'sm',
      sm: 'sm',
      md: 'default',
      lg: 'lg',
    };
    return map[this.size()] ?? 'default';
  });

  readonly xsCls = computed(() => (this.size() === 'xs' ? 'w-7 h-7' : ''));
}
