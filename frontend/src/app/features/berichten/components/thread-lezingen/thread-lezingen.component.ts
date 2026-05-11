import { Component, computed, inject, input, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { MessagesService, ThreadLezingInfo } from '../../services/messages.service';
import { Thread } from '../../services/threads.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { SpinnerComponent } from '../../../../shared/components/design-system';

// Tailwind safelist — do NOT remove
const _TW_SAFELIST = [
  'text-green-500', 'dark:text-green-400',
  'text-gray-300', 'dark:text-gray-600',
  'text-gray-800', 'dark:text-gray-200',
  'text-gray-400', 'dark:text-gray-500',
];

@Component({
  selector: 'app-thread-lezingen',
  standalone: true,
  imports: [NgClass, SpinnerComponent],
  templateUrl: './thread-lezingen.component.html',
})
export class ThreadLezingenComponent {
  private readonly messagesService = inject(MessagesService);
  private readonly auth = inject(AuthService);

  readonly thread = input.required<Thread>();

  readonly isExpanded = signal(false);
  readonly loading = signal(false);
  readonly lezingen = signal<ThreadLezingInfo[]>([]);
  readonly gezienCount = signal(0);
  readonly totalCount = signal(0);

  readonly isAuthor = computed(() =>
    this.thread().authorUid === this.auth.currentUser()?.uid
  );

  async toggle(): Promise<void> {
    if (!this.isAuthor()) return;

    if (this.isExpanded()) {
      this.isExpanded.set(false);
      return;
    }

    this.isExpanded.set(true);
    this.loading.set(true);
    try {
      const result = await this.messagesService.getThreadLezingen(
        this.thread().id,
        this.thread().groepId,
      );
      this.lezingen.set(result.lezingen);
      this.gezienCount.set(result.gezienCount);
      this.totalCount.set(result.totalCount);
    } catch {
      // silently fail — non-critical UI
    } finally {
      this.loading.set(false);
    }
  }
}
