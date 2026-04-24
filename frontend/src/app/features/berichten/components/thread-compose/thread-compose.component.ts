import { Component, inject, signal, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BerichtenService } from '../../berichten.service';
import { ToastService } from '../../../../shared/components/toast/toast.service';
import { InputComponent, TextareaComponent, ButtonComponent } from '../../../../shared/components/design-system';

@Component({
  selector: 'app-thread-compose',
  templateUrl: './thread-compose.component.html',
  standalone: true,
  imports: [CommonModule, FormsModule, InputComponent, TextareaComponent, ButtonComponent],
})
export class ThreadComposeComponent {
  protected readonly service = inject(BerichtenService);
  private readonly toast = inject(ToastService);

  readonly created = output<string>();
  readonly cancelled = output<void>();

  title = signal('');
  body = signal('');
  saving = signal(false);

  get canSubmit(): boolean {
    return this.title().trim().length > 0;
  }

  async submit(): Promise<void> {
    const groepId = this.service.activeGroepId();
    if (!groepId || !this.canSubmit) return;
    this.saving.set(true);
    try {
      const result = await this.service.createThread(groepId, this.title(), this.body());
      this.toast.success('Thread aangemaakt.');
      this.title.set('');
      this.body.set('');
      this.created.emit(result.threadId);
    } catch {
      this.toast.error('Aanmaken mislukt. Probeer opnieuw.');
    } finally {
      this.saving.set(false);
    }
  }
}
