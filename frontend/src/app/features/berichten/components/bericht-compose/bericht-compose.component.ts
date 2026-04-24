import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BerichtenService } from '../../berichten.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { ToastService } from '../../../../shared/components/toast/toast.service';
import { ButtonComponent, FormFieldComponent, TextareaComponent } from '../../../../shared/components/design-system';
import { LucideSend, LucideFileText } from '../../../../shared/lucide-icons';

@Component({
  selector: 'app-bericht-compose',
  standalone: true,
  imports: [
    CommonModule,
    ButtonComponent,
    FormFieldComponent,
    TextareaComponent,
    LucideSend,
    LucideFileText,
  ],
  templateUrl: './bericht-compose.component.html',
})
export class BerichtComposeComponent {
  readonly service = inject(BerichtenService);
  private readonly toast = inject(ToastService);
  readonly auth = inject(AuthService);

  readonly body = signal('');
  readonly sending = signal(false);
  readonly savingConcept = signal(false);

  async send(): Promise<void> {
    const groepId = this.service.activeGroepId();
    const text = this.body().trim();
    if (!groepId || !text) return;

    this.sending.set(true);
    try {
      await this.service.sendBericht(groepId, text);
      this.body.set('');
    } catch {
      this.toast.error('Bericht kon niet worden verstuurd.');
    } finally {
      this.sending.set(false);
    }
  }

  async saveAsConcept(): Promise<void> {
    const text = this.body().trim();
    if (!text) {
      this.toast.warning('Schrijf eerst een bericht.');
      return;
    }

    this.savingConcept.set(true);
    try {
      await this.service.saveConcept({
        groepId: this.service.activeGroepId() ?? undefined,
        body: text,
      });
      this.body.set('');
      this.toast.success('Concept opgeslagen.');
    } catch {
      this.toast.error('Concept kon niet worden opgeslagen.');
    } finally {
      this.savingConcept.set(false);
    }
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.send();
    }
  }
}
