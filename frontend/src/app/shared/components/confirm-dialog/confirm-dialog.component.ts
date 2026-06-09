import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { ButtonComponent } from '../button/button.component';

/**
 * DSC ConfirmDialog component.
 *
 * Declaratief via @if in de parent template.
 * Gebruikt ButtonComponent voor de actieknoppen.
 *
 * Usage:
 * ```html
 * @if (itemToDelete()) {
 *   <app-confirm-dialog
 *     title="Item verwijderen"
 *     [message]="'Weet je zeker dat je ' + itemToDelete()!.naam + ' wilt verwijderen?'"
 *     confirmLabel="Verwijderen"
 *     confirmVariant="danger"
 *     [loading]="deleting()"
 *     (confirmed)="deleteConfirmed()"
 *     (cancelled)="itemToDelete.set(null)"
 *   />
 * }
 * ```
 */
@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [ButtonComponent],
  templateUrl: './confirm-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  host: { style: 'display: block' },
})
export class ConfirmDialogComponent {
  readonly title = input.required<string>();
  readonly message = input.required<string>();
  readonly confirmLabel = input<string>('Bevestigen');
  readonly confirmVariant = input<'danger' | 'primary'>('danger');
  readonly loading = input<boolean>(false);
  readonly confirmed = output<void>();
  readonly cancelled = output<void>();
}
