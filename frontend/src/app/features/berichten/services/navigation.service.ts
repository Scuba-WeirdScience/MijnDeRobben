import { Injectable, inject } from '@angular/core';
import { GroepenService } from './groepen.service';
import { ThreadsService } from './threads.service';
import { MessagesService } from './messages.service';

@Injectable({ providedIn: 'root' })
export class BerichtenNavigationService {
  private readonly groepenService = inject(GroepenService);
  private readonly threadsService = inject(ThreadsService);
  private readonly messagesService = inject(MessagesService);

  selectGroep(groepId: string): void {
    this.groepenService.activeGroepId.set(groepId);
    this.threadsService.activeThreadId.set(null);
    this.threadsService.threads.set([]);
    this.messagesService.messages.set([]);
  }

  selectGroepAndThread(groepId: string, threadId: string): void {
    this.groepenService.activeGroepId.set(groepId);
    this.threadsService.activeThreadId.set(threadId);
    this.threadsService.threads.set([]);
    this.messagesService.messages.set([]);
    this.messagesService.readMessageIds.set(new Set());
  }

  selectThread(threadId: string): void {
    this.threadsService.activeThreadId.set(threadId);
    this.messagesService.messages.set([]);
    this.messagesService.readMessageIds.set(new Set());
  }
}
