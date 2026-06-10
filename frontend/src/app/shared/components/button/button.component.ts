import { Component, computed, input, ChangeDetectionStrategy } from '@angular/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { SpinnerComponent } from '../spinner/spinner.component';

@Component({
  selector: 'app-button',
  standalone: true,
  imports: [...HlmButtonImports, SpinnerComponent],
  templateUrl: './button.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display: inline-block' },
})
export class ButtonComponent {
  readonly variant = input<'primary' | 'secondary' | 'danger' | 'ghost'>('primary');
  readonly size = input<'sm' | 'md' | 'lg'>('md');
  readonly disabled = input<boolean>(false);
  readonly loading = input<boolean>(false);
  readonly type = input<'button' | 'submit' | 'reset'>('button');

  readonly spartanVariant = computed<'default' | 'secondary' | 'destructive' | 'ghost' | 'outline' | 'link'>(() => {
    const map: Record<string, 'default' | 'secondary' | 'destructive' | 'ghost' | 'outline' | 'link'> = {
      primary: 'default',
      secondary: 'secondary',
      danger: 'destructive',
      ghost: 'ghost',
    };
    return map[this.variant()] ?? 'default';
  });

  readonly spartanSize = computed<'default' | 'sm' | 'lg' | 'xs' | 'icon' | 'icon-sm' | 'icon-xs' | 'icon-lg'>(() => {
    const map: Record<string, 'default' | 'sm' | 'lg' | 'xs' | 'icon' | 'icon-sm' | 'icon-xs' | 'icon-lg'> = {
      sm: 'sm',
      md: 'default',
      lg: 'lg',
    };
    return map[this.size()] ?? 'default';
  });
}
