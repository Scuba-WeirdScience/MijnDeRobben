import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { ButtonComponent } from '../button/button.component';
import { PwaService } from '../../../core/services/pwa.service';
import { LocaleDatePipe } from '../../pipes/locale-date.pipe';

// In-file safelist so Tailwind scanner picks up dynamic classes — do NOT remove
const _TW_SAFELIST = [
  'dark:bg-gray-800',
  'dark:text-white',
  'dark:text-gray-300',
  'dark:text-gray-400',
  'dark:border-gray-700',
];

/**
 * DSC ReleaseNotesDialog — toont de releasenotes voor de huidige versie.
 *
 * Verschijnt automatisch na een SW-update wanneer er releasenotes zijn
 * voor de nieuwe versie. Wordt beheerd door PwaService.
 *
 * Usage (in app.html):
 * ```html
 * @if (pwa.showReleaseNotes()) {
 *   <app-release-notes-dialog />
 * }
 * ```
 */
@Component({
  selector: 'app-release-notes-dialog',
  standalone: true,
  imports: [ButtonComponent, LocaleDatePipe],
  templateUrl: './release-notes-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  host: { style: 'display: block' },
})
export class ReleaseNotesDialogComponent {
  readonly pwa = inject(PwaService);
}
