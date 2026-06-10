import { Component, computed, input, ChangeDetectionStrategy } from '@angular/core';
import { HlmSpinnerImports } from '@spartan-ng/helm/spinner';

@Component({
  selector: 'app-spinner',
  standalone: true,
  imports: [...HlmSpinnerImports],
  templateUrl: './spinner.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpinnerComponent {
  readonly size = input<'sm' | 'md' | 'lg'>('md');
  readonly fullPage = input(false);

  readonly sizeCls = computed(() => {
    const sizes: Record<string, string> = {
      sm: 'text-3',
      md: 'text-5',
      lg: 'text-8',
    };
    return sizes[this.size()];
  });
}
