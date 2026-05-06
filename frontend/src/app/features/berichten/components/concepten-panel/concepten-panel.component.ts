import { Component, computed, inject, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BerichtenService, Message, ThreadConcept } from '../../berichten.service';
import { ToastService } from '../../../../shared/components/toast/toast.service';
import { LucideFileText, LucideMessageSquare } from '../../../../shared/lucide-icons';
import { EmptyStateComponent } from '../../../../shared/components/design-system';

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
  imports: [CommonModule, LucideFileText, LucideMessageSquare, EmptyStateComponent],
  templateUrl: './concepten-panel.component.html',
})
export class ConceptenPanelComponent {
  protected readonly service = inject(BerichtenService);
  private readonly toast = inject(ToastService);

  readonly conceptSelected = output<ConceptSelected>();

  /** Group name lookup from groepen signal */
  private readonly groepNames = computed(() => {
    const map = new Map<string, string>();
    for (const g of this.service.groepen()) map.set(g.id, g.name);
    return map;
  });

  groepName(groepId: string): string {
    return this.groepNames().get(groepId) ?? groepId;
  }

  /** Thread name lookup — only available for threads currently loaded (active groep) */
  threadTitle(threadId: string): string {
    return this.service.threads().find(t => t.id === threadId)?.title ?? '…';
  }

  /** Combined list: thread concepts + message concepts, sorted by updatedAt desc */
  readonly allConcepts = computed(() => {
    const threads = this.service.allThreadConcepten().map(c => ({ kind: 'thread' as const, concept: c, updatedAt: c.updatedAt?.toMillis?.() ?? 0 }));
    const messages = this.service.allMessageConcepten().map(c => ({ kind: 'message' as const, concept: c, updatedAt: c.updatedAt?.toMillis?.() ?? 0 }));
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
      await this.service.publishThreadConcept(conceptId);
      this.toast.success('Thread gepubliceerd.');
    } catch {
      this.toast.error('Publiceren mislukt.');
    }
  }

  async deleteThreadConcept(conceptId: string, event: Event): Promise<void> {
    event.stopPropagation();
    try {
      await this.service.deleteThreadConcept(conceptId);
      this.toast.success('Concept verwijderd.');
    } catch {
      this.toast.error('Verwijderen mislukt.');
    }
  }

  async publishMessageConcept(conceptId: string, event: Event): Promise<void> {
    event.stopPropagation();
    try {
      await this.service.publishMessageConcept(conceptId);
      this.toast.success('Bericht gepubliceerd.');
    } catch {
      this.toast.error('Publiceren mislukt.');
    }
  }

  async deleteMessageConcept(conceptId: string, event: Event): Promise<void> {
    event.stopPropagation();
    try {
      await this.service.deleteMessageConcept(conceptId);
      this.toast.success('Concept verwijderd.');
    } catch {
      this.toast.error('Verwijderen mislukt.');
    }
  }
}
