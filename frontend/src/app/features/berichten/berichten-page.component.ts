import { Component, computed, inject, signal, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { BreakpointObserver } from '@angular/cdk/layout';
import { map } from 'rxjs';
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

const COMPOSE_MIN_PX = 80;
const COMPOSE_MAX_PX = 500;
const COMPOSE_DEFAULT_PX = 160;
const STORAGE_KEY = 'berichten-compose-height';

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
  private readonly host = inject(ElementRef<HTMLElement>);

  readonly isAdmin = computed(() => this.auth.hasAnyRole(['Beheer', 'Bestuur']));

  readonly isMobile = toSignal(
    inject(BreakpointObserver).observe('(max-width: 767px)').pipe(
      map(result => result.matches)
    ),
    { initialValue: false }
  );

  mobilePanel = signal<MobilePanel>('groepen');
  showBeheer = signal(false);
  showNewThread = signal(false);

  // ── Resizable compose bar ─────────────────────────────────────────────────
  composeHeight = signal<number>(
    Number(localStorage.getItem(STORAGE_KEY)) || COMPOSE_DEFAULT_PX
  );

  private dragging = false;
  private dragStartY = 0;
  private dragStartHeight = 0;

  onDragStart(event: MouseEvent | TouchEvent): void {
    this.dragging = true;
    this.dragStartY = event instanceof MouseEvent ? event.clientY : event.touches[0].clientY;
    this.dragStartHeight = this.composeHeight();
    event.preventDefault();
  }

  @HostListener('document:mousemove', ['$event'])
  @HostListener('document:touchmove', ['$event'])
  onDragMove(event: MouseEvent | TouchEvent): void {
    if (!this.dragging) return;
    const clientY = event instanceof MouseEvent ? event.clientY : event.touches[0].clientY;
    const delta = this.dragStartY - clientY; // dragging up = larger compose
    const newHeight = Math.min(COMPOSE_MAX_PX, Math.max(COMPOSE_MIN_PX, this.dragStartHeight + delta));
    this.composeHeight.set(newHeight);
  }

  @HostListener('document:mouseup')
  @HostListener('document:touchend')
  onDragEnd(): void {
    if (!this.dragging) return;
    this.dragging = false;
    localStorage.setItem(STORAGE_KEY, String(this.composeHeight()));
  }

  constructor() {
    this.auth.refreshUser();
  }

  onGroepSelected(): void { this.mobilePanel.set('threads'); }
  onThreadSelected(): void { this.mobilePanel.set('messages'); }
  onNewThread(): void { this.showNewThread.set(true); }

  onThreadCreated(threadId: string): void {
    this.showNewThread.set(false);
    this.service.selectThread(threadId);
    this.mobilePanel.set('messages');
  }
}
