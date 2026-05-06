import { Component, computed, inject, signal, HostListener, ElementRef, ViewChild, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { BreakpointObserver } from '@angular/cdk/layout';
import { map } from 'rxjs';
import { BerichtenService, Message, ThreadConcept } from './berichten.service';
import { AuthService } from '../../core/auth/auth.service';
import { GroepListComponent } from './components/groep-list/groep-list.component';
import { ThreadListComponent } from './components/thread-list/thread-list.component';
import { ThreadComposeComponent } from './components/thread-compose/thread-compose.component';
import { MessageListComponent } from './components/message-list/message-list.component';
import { MessageComposeComponent } from './components/message-compose/message-compose.component';
import { GroepBeheerComponent } from './components/groep-beheer/groep-beheer.component';
import { ConceptenPanelComponent, ConceptSelected } from './components/concepten-panel/concepten-panel.component';
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
    ConceptenPanelComponent,
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
  showConcepten = signal(false);

  /** Thread concept being edited (pre-fills thread-compose side panel) */
  editingThreadConcept = signal<ThreadConcept | null>(null);

  @ViewChild(MessageComposeComponent) private messageCompose?: MessageComposeComponent;

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

    // When a pending message concept edit is set AND the thread becomes active,
    // load it into the editor and clear the pending state.
    effect(() => {
      const pending = this.service.pendingConceptEdit();
      const activeThreadId = this.service.activeThreadId();
      if (pending && activeThreadId === pending.threadId) {
        // Defer a full macrotask so Angular has time to render the compose component
        setTimeout(() => {
          if (this.messageCompose) {
            this.messageCompose.loadConcept(pending);
            this.service.pendingConceptEdit.set(null);
          }
          // If messageCompose is still not ready, leave pendingConceptEdit set
          // so the effect retries on the next render cycle
        }, 0);
      }
    });
  }

  onGroepSelected(): void {
    this.showConcepten.set(false);
    this.mobilePanel.set('threads');
  }

  onThreadSelected(): void { this.mobilePanel.set('messages'); }
  onNewThread(): void { this.showNewThread.set(true); }

  onShowConcepten(): void {
    this.showConcepten.set(true);
    this.mobilePanel.set('threads');
  }

  onThreadCreated(threadId: string): void {
    this.showNewThread.set(false);
    this.editingThreadConcept.set(null);
    this.service.selectThread(threadId);
    this.mobilePanel.set('messages');
  }

  onConceptSelected(event: ConceptSelected): void {
    this.showConcepten.set(false);

    if (event.type === 'thread') {
      // Open thread-compose pre-filled with this concept
      this.editingThreadConcept.set(event.concept);
      this.showNewThread.set(true);
    } else {
      // Navigate to groep+thread, then load concept into editor
      const concept = event.concept;
      this.service.pendingConceptEdit.set(concept);
      this.service.selectGroep(concept.groepId);
      this.service.selectThread(concept.threadId);
      this.mobilePanel.set('messages');
    }
  }
}
