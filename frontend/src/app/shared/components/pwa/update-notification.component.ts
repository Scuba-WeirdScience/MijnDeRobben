import { Component, inject } from '@angular/core';
import { PwaService } from '../../../core/services/pwa.service';
import { LucideRefreshCw } from '../../lucide-icons';

@Component({
  selector: 'app-update-notification',
  standalone: true,
  imports: [LucideRefreshCw],
  templateUrl: './update-notification.component.html',
})
export class UpdateNotificationComponent {
  readonly pwa = inject(PwaService);
}
