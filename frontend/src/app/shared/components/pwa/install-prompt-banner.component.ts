import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { PwaService } from '../../../core/services/pwa.service';
import { LucideSmartphone, LucideX } from '../../lucide-icons';

@Component({
  selector: 'app-install-prompt-banner',
  standalone: true,
  imports: [LucideSmartphone, LucideX],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './install-prompt-banner.component.html',
})
export class InstallPromptBannerComponent {
  readonly pwa = inject(PwaService);
}
