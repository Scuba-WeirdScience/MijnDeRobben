import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { HlmFieldImports } from '@spartan-ng/helm/field';

const _TW_SAFELIST = ['text-red-500', 'ml-0.5'];

@Component({
  selector: 'app-form-field',
  standalone: true,
  imports: [...HlmFieldImports],
  templateUrl: './form-field.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display: block' },
})
export class FormFieldComponent {
  readonly label = input<string>('');
  readonly required = input<boolean>(false);
  readonly hint = input<string>('');
  readonly error = input<string | null>(null);
}
