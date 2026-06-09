import { Component, computed, inject, output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GroepenService, Groep } from '../../services/groepen.service';
import { ThreadsService } from '../../services/threads.service';
import { MessagesService } from '../../services/messages.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { BadgeComponent, SkeletonRowsComponent } from '../../../../shared/components/design-system';
import { LucideMessageSquare, LucideUsers, LucideFileText } from '../../../../shared/lucide-icons';

// Tailwind safelist — do NOT remove
const _TW_SAFELIST = [
  'bg-scuba-50',
  'dark:bg-scuba-900/20',
  'border-scuba-500',
  'hover:bg-scuba-100',
  'dark:hover:bg-scuba-900/30',
  'hover:bg-gray-50',
  'dark:hover:bg-gray-700/50',
  'font-semibold',
  'text-scuba-700',
  'dark:text-scuba-300',
];

@Component({
  selector: 'app-groep-list',
  standalone: true,
  imports: [
    CommonModule,
    BadgeComponent,
    SkeletonRowsComponent,
    LucideMessageSquare,
    LucideUsers,
    LucideFileText,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './groep-list.component.html',
})
export class GroepListComponent {
  readonly groepenService = inject(GroepenService);
  readonly threadsService = inject(ThreadsService);
  readonly messagesService = inject(MessagesService);
  readonly auth = inject(AuthService);

  readonly openBeheer = output<void>();
  readonly selectConcepten = output<void>();
  readonly groepSelected = output<string>();

  readonly isAdmin = computed(() => this.auth.hasAnyRole(['Beheer', 'Bestuur']));

  readonly totalConcepts = computed(
    () =>
      this.threadsService.allThreadConcepten().length +
      this.messagesService.allMessageConcepten().length
  );

  selectGroep(groep: Groep): void {
    this.groepenService.selectGroep(groep.id);
    this.groepSelected.emit(groep.id);
  }

  totalUnread(): number {
    return this.groepenService.groepen().reduce((sum, g) => sum + g.unreadCount, 0);
  }
}
