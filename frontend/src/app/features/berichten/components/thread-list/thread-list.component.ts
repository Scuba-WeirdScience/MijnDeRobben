import { Component, computed, inject, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BerichtenService } from '../../berichten.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { LucidePlus, LucideHash, LucidePin } from '../../../../shared/lucide-icons';


const _TW_SAFELIST = [
  'bg-scuba-50', 'border-scuba-500', 'text-scuba-700',
  'dark:bg-scuba-900/20', 'dark:border-scuba-400', 'dark:text-scuba-300',
  'border-amber-400', 'bg-amber-50', 'dark:bg-amber-900/20',
];

@Component({
  selector: 'app-thread-list',
  templateUrl: './thread-list.component.html',
  standalone: true,
  imports: [CommonModule, LucidePlus, LucideHash, LucidePin],
})
export class ThreadListComponent {
  protected readonly service = inject(BerichtenService);
  protected readonly auth = inject(AuthService);

  readonly newThread = output<void>();
  readonly threadSelected = output<void>();

  readonly isNonLid = computed(() =>
    this.auth.hasAnyRole(['Beheer', 'Bestuur', 'MateriaalCommissie', 'InstructieKader'])
  );

  selectThread(threadId: string): void {
    this.service.selectThread(threadId);
    this.threadSelected.emit();
  }

  getThreadUnread(thread: any): number {
    const uid = this.auth.currentUser()?.uid;
    if (!uid) return 0;
    return thread.unreadPerUser?.[uid] ?? 0;
  }
}
