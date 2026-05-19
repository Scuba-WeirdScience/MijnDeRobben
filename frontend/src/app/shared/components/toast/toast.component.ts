import { Component, inject } from '@angular/core';
import { ToastService, ToastType } from './toast.service';

const TOAST_CLASSES: Record<ToastType, string> = {
  success: 'bg-green-600 text-white',
  error:   'bg-red-600 text-white',
  warning: 'bg-yellow-500 text-white',
  info:    'bg-scuba-600 text-white',
};

@Component({
  selector: 'app-toast',
  standalone: true,
  templateUrl: './toast.component.html',
})
export class ToastComponent {
  readonly toastService = inject(ToastService);

  toastClass(type: ToastType): string {
    return TOAST_CLASSES[type];
  }
}
