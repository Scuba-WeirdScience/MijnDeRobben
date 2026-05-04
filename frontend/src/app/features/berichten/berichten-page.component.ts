import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BerichtenService } from './berichten.service';
import { AuthService } from '../../core/auth/auth.service';
import { GroepListComponent } from './components/groep-list/groep-list.component';
import { ThreadListComponent } from './components/thread-list/thread-list.component';
import { ThreadComposeComponent } from './components/thread-compose/thread-compose.component';
import { MessageListComponent } from './components/message-list/message-list.component';
import { MessageComposeComponent } from './components/message-compose/message-compose.component';
import { GroepBeheerComponent } from './components/groep-beheer/groep-beheer.component';
import { SidePanelComponent } from '../../shared/components/design-system';
import { LucideChevronLeft } from '../../shared/lucide-icons';

type MobilePanel = 'groepen' | 'threads' | 'messages';

@Component({
  selector: 'app-berichten-page',
  templateUrl: './berichten-page.component.html',
  host: { class: 'flex-1 min-h-0 flex flex-col' },
  standalone: true,
  imports: [
    CommonModule,
    GroepListComponent,
    ThreadListComponent,
    ThreadComposeComponent,
    MessageListComponent,
    MessageComposeComponent,
    GroepBeheerComponent,
    SidePanelComponent,
    LucideChevronLeft,
  ],
})
export class BerichtenPageComponent {
  protected readonly service = inject(BerichtenService);
  protected readonly auth = inject(AuthService);

  readonly isAdmin = computed(() => this.auth.hasAnyRole(['Beheer', 'Bestuur']));

  isMobile(): boolean {
    return window.innerWidth < 768;
  }

  // Mobile navigation
  mobilePanel = signal<MobilePanel>('groepen');

  // Side panels
  showBeheer = signal(false);
  showNewThread = signal(false);

  constructor() {
    // Ensure token claims are fresh so role-gated UI shows correctly
    this.auth.refreshUser();
  }

  onGroepSelected(): void {
    this.mobilePanel.set('threads');
  }

  onThreadSelected(): void {
    this.mobilePanel.set('messages');
  }

  onNewThread(): void {
    this.showNewThread.set(true);
  }

  onThreadCreated(threadId: string): void {
    this.showNewThread.set(false);
    this.service.selectThread(threadId);
    this.mobilePanel.set('messages');
  }
}
