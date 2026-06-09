import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { ButtonComponent } from '../../../shared/components/design-system';
import { EditScope } from '../activiteiten.service';

@Component({
  selector: 'app-activiteit-occurrence-dialog',
  standalone: true,
  imports: [ButtonComponent],
  templateUrl: './activiteit-occurrence-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  host: { style: 'display: block' },
})
export class ActiviteitOccurrenceDialogComponent {
  readonly activiteitTitel = input.required<string>();
  readonly action = input.required<'bewerken' | 'verwijderen'>();
  readonly scopeGekozen = output<EditScope>();
  readonly geannuleerd = output<void>();

  selectedScope: EditScope = 'single';

  onBevestigen(): void {
    this.scopeGekozen.emit(this.selectedScope);
  }
}
