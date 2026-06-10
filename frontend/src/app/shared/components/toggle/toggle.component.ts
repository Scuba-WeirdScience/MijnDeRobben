import { Component, input, model, ChangeDetectionStrategy } from '@angular/core';
import { HlmToggleImports } from '@spartan-ng/helm/toggle';

@Component({
  selector: 'app-toggle',
  standalone: true,
  imports: [...HlmToggleImports],
  templateUrl: './toggle.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToggleComponent {
  readonly pressed = model(false);
  readonly variant = input<'default' | 'outline'>('default');
  readonly size = input<'default' | 'sm' | 'lg'>('default');
  readonly ariaLabel = input<string>('Toggle');
}
