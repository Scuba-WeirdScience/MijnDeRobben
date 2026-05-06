import { Component, computed, inject, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BerichtenService, Groep } from '../../berichten.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { BadgeComponent } from '../../../../shared/components/design-system';
import {
  LucideMessageSquare,
  LucideUsers,
  LucideFileText,
} from '../../../../shared/lucide-icons';

// Tailwind safelist — do NOT remove
const _TW_SAFELIST = [
  'bg-scuba-50', 'dark:bg-scuba-900/20', 'border-scuba-500',
  'hover:bg-scuba-100', 'dark:hover:bg-scuba-900/30',
  'hover:bg-gray-50', 'dark:hover:bg-gray-700/50',
  'font-semibold', 'text-scuba-700', 'dark:text-scuba-300',
];

@Component({
  selector: 'app-groep-list',
  standalone: true,
  imports: [
    CommonModule,
    BadgeComponent,
    LucideMessageSquare,
    LucideUsers,
    LucideFileText,
  ],
  templateUrl: './groep-list.component.html',
})
export class GroepListComponent {
  readonly service = inject(BerichtenService);
  readonly auth = inject(AuthService);

  readonly openBeheer = output<void>();
  readonly selectConcepten = output<void>();
  readonly groepSelected = output<void>();

  readonly isAdmin = computed(() => this.auth.hasAnyRole(['Beheer', 'Bestuur']));

  readonly totalConcepts = computed(() =>
    this.service.allThreadConcepten().length + this.service.allMessageConcepten().length
  );

  selectGroep(groep: Groep): void {
    this.service.selectGroep(groep.id);
    this.groepSelected.emit();
  }

  totalUnread(): number {
    return this.service.groepen().reduce((sum, g) => sum + g.unreadCount, 0);
  }
}
