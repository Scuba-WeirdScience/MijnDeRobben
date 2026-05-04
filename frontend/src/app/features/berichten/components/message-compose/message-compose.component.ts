import {
  Component, inject, signal, ViewChild, ElementRef,
  OnDestroy, NgZone, CUSTOM_ELEMENTS_SCHEMA, HostListener,
  effect, afterNextRender,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import Quill from 'quill';
import { BerichtenService } from '../../berichten.service';
import { ToastService } from '../../../../shared/components/toast/toast.service';
import { LucideSend, LucideFileText, LucideSmile } from '../../../../shared/lucide-icons';

@Component({
  selector: 'app-message-compose',
  templateUrl: './message-compose.component.html',
  styleUrl: './message-compose.component.css',
  standalone: true,
  imports: [CommonModule, LucideSend, LucideFileText, LucideSmile],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class MessageComposeComponent implements OnDestroy {
  protected readonly service = inject(BerichtenService);
  private readonly toast = inject(ToastService);
  private readonly zone = inject(NgZone);

  @ViewChild('editorMount') editorMount?: ElementRef<HTMLDivElement>;

  private quill: Quill | null = null;
  body = signal('');
  sending = signal(false);
  savingConcept = signal(false);
  showEmojiPicker = signal(false);

  private readonly toolbarOptions = [
    ['bold', 'italic', 'underline', 'strike'],
    [{ list: 'bullet' }],
    ['clean'],
  ];

  constructor() {
    // Re-initialise Quill each time a thread becomes active (editorMount enters the DOM)
    effect(() => {
      const threadId = this.service.activeThreadId();
      if (!threadId) {
        this.destroyQuill();
        return;
      }
      // Wait one render cycle for #editorMount to be stamped into the DOM
      afterNextRender(() => {
        if (!this.editorMount || this.quill) return;
        this.initQuill(this.editorMount.nativeElement);
      });
    });
  }

  private initQuill(container: HTMLDivElement): void {
    this.zone.runOutsideAngular(() => {
      this.quill = new Quill(container, {
        theme: 'snow',
        modules: {
          toolbar: this.toolbarOptions,
          keyboard: {
            bindings: {
              enter: {
                key: 'Enter',
                shiftKey: false,
                handler: () => {
                  this.zone.run(() => this.send());
                  return false;
                },
              },
            },
          },
        },
        placeholder: 'Schrijf een bericht… (Enter om te versturen)',
      });

      this.quill.on('text-change', () => {
        const editor = container.querySelector('.ql-editor') as HTMLElement;
        const html = editor?.innerHTML ?? '';
        this.zone.run(() => {
          this.body.set(html === '<p><br></p>' ? '' : html);
        });
      });
    });

    // Pre-load emoji-mart so the picker opens instantly
    import('@emoji-mart/data').then(async ({ default: data }) => {
      const { init } = await import('emoji-mart');
      init({ data });
    });
  }

  private destroyQuill(): void {
    this.quill = null;
    this.body.set('');
  }

  ngOnDestroy(): void {
    this.destroyQuill();
  }

  onEmojiSelect(event: any): void {
    const emoji: string = event?.detail?.native ?? event?.native ?? '';
    if (!emoji || !this.quill) return;
    const range = this.quill.getSelection(true);
    this.quill.insertText(range.index, emoji, 'user');
    this.quill.setSelection(range.index + (emoji.length as any), 0);
    this.showEmojiPicker.set(false);
  }

  toggleEmojiPicker(): void {
    this.showEmojiPicker.update(v => !v);
  }

  closeEmojiPicker(): void {
    this.showEmojiPicker.set(false);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.showEmojiPicker()) {
      this.showEmojiPicker.set(false);
    }
  }

  clearEditor(): void {
    if (!this.quill) return;
    this.quill.setContents([]);
    this.body.set('');
  }

  async send(): Promise<void> {
    const threadId = this.service.activeThreadId();
    const groepId = this.service.activeGroepId();
    if (!threadId || !groepId || !this.body().trim() || this.sending()) return;
    this.sending.set(true);
    try {
      await this.service.sendMessage(threadId, groepId, this.body());
      this.clearEditor();
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
      this.clearEditor();
      this.toast.success('Concept opgeslagen.');
    } catch {
      this.toast.error('Opslaan mislukt.');
    } finally {
      this.savingConcept.set(false);
    }
  }
}
