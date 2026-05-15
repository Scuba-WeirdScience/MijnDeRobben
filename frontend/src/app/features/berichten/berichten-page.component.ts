import { Component, computed, inject, signal, HostListener, ElementRef, ViewChild, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { BreakpointObserver } from '@angular/cdk/layout';
import { ActivatedRoute, Router, NavigationEnd, RouterOutlet } from '@angular/router';
import { map, filter, startWith } from 'rxjs';
import { MessagesService } from './services/messages.service';
import { ThreadsService, ThreadConcept } from './services/threads.service';
import { GroepenService } from './services/groepen.service';
import { BerichtenNavigationService } from './services/navigation.service';
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
    RouterOutlet,
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
  protected readonly messagesService = inject(MessagesService);
  protected readonly threadsService = inject(ThreadsService);
  protected readonly groepenService = inject(GroepenService);
  private readonly navigation = inject(BerichtenNavigationService);
  protected readonly auth = inject(AuthService);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

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

    // ── Sync route params → service signals ─────────────────────────────────
    // After every navigation, read params from the active child route.
    const childParams = toSignal(
      this.router.events.pipe(
        filter(e => e instanceof NavigationEnd),
        startWith(null),
        map(() => {
          const child = this.route.firstChild;
          return child?.snapshot.params ?? {};
        })
      ),
      { initialValue: {} }
    );

    effect(() => {
      const p = childParams() as Record<string, string | undefined>;
      const groepId = p['groepId'];
      const threadId = p['threadId'];

      if (groepId && threadId) {
        this.navigation.selectGroepAndThread(groepId, threadId);
        this.mobilePanel.set('messages');
      } else if (groepId) {
        this.navigation.selectGroep(groepId);
        this.mobilePanel.set('threads');
      }
    });

    // When a pending message concept edit is set AND the thread becomes active,
    // load it into the editor and clear the pending state.
    effect(() => {
      const pending = this.messagesService.pendingConceptEdit();
      const activeThreadId = this.threadsService.activeThreadId();
      if (pending && activeThreadId === pending.threadId) {
        // Defer a full macrotask so Angular has time to render the compose component
        setTimeout(() => {
          if (this.messageCompose) {
            this.messageCompose.loadConcept(pending);
            this.messagesService.setPendingConceptEdit(null);
          }
          // If messageCompose is still not ready, leave pendingConceptEdit set
          // so the effect retries on the next render cycle
        }, 0);
      }
    });
  }

  onGroepSelected(groepId: string): void {
    this.showConcepten.set(false);
    this.mobilePanel.set('threads');
    this.router.navigate(['/berichten', groepId]);
  }

  onThreadSelected(threadId: string): void {
    this.mobilePanel.set('messages');
    const groepId = this.groepenService.activeGroepId();
    if (groepId) {
      this.router.navigate(['/berichten', groepId, threadId]);
    }
  }

  onNewThread(): void { this.showNewThread.set(true); }

  onShowConcepten(): void {
    this.showConcepten.set(true);
    this.mobilePanel.set('threads');
  }

  onThreadCreated(threadId: string): void {
    this.showNewThread.set(false);
    this.editingThreadConcept.set(null);
    this.navigation.selectThread(threadId);
    const groepId = this.groepenService.activeGroepId();
    if (groepId) {
      this.router.navigate(['/berichten', groepId, threadId]);
    }
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
      this.messagesService.setPendingConceptEdit(concept);
      this.router.navigate(['/berichten', concept.groepId, concept.threadId]);
      this.mobilePanel.set('messages');
    }
  }
}
