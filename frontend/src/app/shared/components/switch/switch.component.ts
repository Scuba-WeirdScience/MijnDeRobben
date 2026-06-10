import { Component, input, model, ChangeDetectionStrategy } from '@angular/core';
import { HlmSwitchImports } from '@spartan-ng/helm/switch';

@Component({
  selector: 'app-switch',
  standalone: true,
  imports: [...HlmSwitchImports],
  templateUrl: './switch.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SwitchComponent {
  readonly checked = model(false);
  readonly disabled = input(false);
  readonly size = input<'default' | 'sm'>('default');
  readonly ariaLabel = input<string>('Schakelaar');
}
