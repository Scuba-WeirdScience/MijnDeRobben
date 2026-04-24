import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BerichtenService } from '../../berichten.service';
import { ToastService } from '../../../../shared/components/toast/toast.service';
import { LucideSend, LucideFileText } from '../../../../shared/lucide-icons';

@Component({
  selector: 'app-message-compose',
  templateUrl: './message-compose.component.html',
  standalone: true,
  imports: [CommonModule, LucideSend, LucideFileText],
})
export class MessageComposeComponent {
  protected readonly service = inject(BerichtenService);
  private readonly toast = inject(ToastService);

  body = signal('');
  sending = signal(false);
  savingConcept = signal(false);

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.send();
    }
  }

  async send(): Promise<void> {
    const threadId = this.service.activeThreadId();
    const groepId = this.service.activeGroepId();
    if (!threadId || !groepId || !this.body().trim() || this.sending()) return;
    this.sending.set(true);
    try {
      await this.service.sendMessage(threadId, groepId, this.body());
      this.body.set('');
    } catch {
      this.toast.error('Versturen mislukt.');
    } finally {
      this.sending.set(false);
    }
  }

  async saveAsConcept(): Promise<void> {
    const threadId = this.service.activeThreadId();
    const groepId = this.service.activeGroepId();
    if (!threadId || !groepId || !this.body().trim() || this.savingConcept()) return;
    this.savingConcept.set(true);
    try {
      await this.service.saveMessageConcept(threadId, groepId, this.body());
      this.body.set('');
      this.toast.success('Concept opgeslagen.');
    } catch {
      this.toast.error('Opslaan mislukt.');
    } finally {
      this.savingConcept.set(false);
    }
  }
}
