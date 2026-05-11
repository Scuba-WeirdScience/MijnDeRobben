import { Component, computed, inject, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GroepenService } from '../../services/groepen.service';
import { ThreadsService, ThreadConcept } from '../../services/threads.service';
import { MessagesService, Message } from '../../services/messages.service';
import { ToastService } from '../../../../shared/components/toast/toast.service';
import { LucideFileText, LucideMessageSquare } from '../../../../shared/lucide-icons';
import { EmptyStateComponent } from '../../../../shared/components/design-system';
import { EmoticonPipe } from '../../../../shared/pipes/emoticon.pipe';

export interface ThreadConceptSelected {
  type: 'thread';
  concept: ThreadConcept;
}
export interface MessageConceptSelected {
  type: 'message';
  concept: Message;
}
export type ConceptSelected = ThreadConceptSelected | MessageConceptSelected;

// Tailwind safelist — do NOT remove
const _TW_SAFELIST = [
  'text-scuba-600', 'dark:text-scuba-400', 'hover:underline',
  'text-red-500', 'hover:text-red-700',
];

@Component({
  selector: 'app-concepten-panel',
  standalone: true,
  imports: [CommonModule, LucideFileText, LucideMessageSquare, EmptyStateComponent, EmoticonPipe],
  templateUrl: './concepten-panel.component.html',
})
export class ConceptenPanelComponent {
  protected readonly groepenService = inject(GroepenService);
  protected readonly threadsService = inject(ThreadsService);
  protected readonly messagesService = inject(MessagesService);
  private readonly toast = inject(ToastService);

  readonly conceptSelected = output<ConceptSelected>();

  /** Group name lookup from groepen signal */
  private readonly groepNames = computed(() => {
    const map = new Map<string, string>();
    for (const g of this.groepenService.groepen()) map.set(g.id, g.name);
    return map;
  });

  groepName(groepId: string): string {
    return this.groepNames().get(groepId) ?? groepId;
  }

  threadTitle(threadId: string): string {
    return this.threadsService.threads().find(t => t.id === threadId)?.title ?? '…';
  }

  readonly allConcepts = computed(() => {
    const threads = this.threadsService.allThreadConcepten().map(c => ({ kind: 'thread' as const, concept: c, updatedAt: c.updatedAt?.toMillis?.() ?? 0 }));
    const messages = this.messagesService.allMessageConcepten().map(c => ({ kind: 'message' as const, concept: c, updatedAt: c.updatedAt?.toMillis?.() ?? 0 }));
    return [...threads, ...messages].sort((a, b) => b.updatedAt - a.updatedAt);
  });

  openThreadConcept(concept: ThreadConcept): void {
    this.conceptSelected.emit({ type: 'thread', concept });
  }

  openMessageConcept(concept: Message): void {
    this.conceptSelected.emit({ type: 'message', concept });
  }

  async publishThreadConcept(conceptId: string, event: Event): Promise<void> {
    event.stopPropagation();
    try {
      await this.threadsService.publishThreadConcept(conceptId);
      this.toast.success('Thread gepubliceerd.');
    } catch {
      this.toast.error('Publiceren mislukt.');
    }
  }

  async deleteThreadConcept(conceptId: string, event: Event): Promise<void> {
    event.stopPropagation();
    try {
      await this.threadsService.deleteThreadConcept(conceptId);
      this.toast.success('Concept verwijderd.');
    } catch {
      this.toast.error('Verwijderen mislukt.');
    }
  }

  async publishMessageConcept(conceptId: string, event: Event): Promise<void> {
    event.stopPropagation();
    try {
      await this.messagesService.publishMessageConcept(conceptId);
      this.toast.success('Bericht gepubliceerd.');
    } catch {
      this.toast.error('Publiceren mislukt.');
    }
  }

  async deleteMessageConcept(conceptId: string, event: Event): Promise<void> {
    event.stopPropagation();
    try {
      await this.messagesService.deleteMessageConcept(conceptId);
      this.toast.success('Concept verwijderd.');
    } catch {
      this.toast.error('Verwijderen mislukt.');
    }
  }
}
