import {
  Component, inject, signal, ViewChild, ElementRef,
  OnDestroy, NgZone, CUSTOM_ELEMENTS_SCHEMA, effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import Quill from 'quill';
import { BerichtenService } from '../../berichten.service';
import { ToastService } from '../../../../shared/components/toast/toast.service';
import { LucideSend } from '../../../../shared/lucide-icons';

// Fixed overhead: toolbar (~34px) + editor row padding top+bottom (~16px) + border (2px)
const EDITOR_OVERHEAD_PX = 52;

// Safelist for dynamically computed classes (Tailwind scans .ts files as plain text)
const _TW_SAFELIST = [
  'bg-amber-50', 'dark:bg-amber-900/10', '-mx-3', 'px-3', 'rounded',
  'text-scuba-600', 'dark:text-scuba-400', 'hover:underline', 'text-red-500',
];

interface EmojiSuggestion {
  id: string;
  native: string;
  name: string;
}

@Component({
  selector: 'app-message-compose',
  templateUrl: './message-compose.component.html',
  styleUrl: './message-compose.component.css',
  host: { class: 'flex flex-col overflow-hidden' },
  standalone: true,
  imports: [CommonModule, LucideSend],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class MessageComposeComponent implements OnDestroy {
  protected readonly service = inject(BerichtenService);
  private readonly toast = inject(ToastService);
  private readonly zone = inject(NgZone);
  private readonly hostEl = inject(ElementRef<HTMLElement>);

  @ViewChild('editorMount') set editorMount(el: ElementRef<HTMLDivElement> | undefined) {
    if (el && !this.quill) {
      Promise.resolve().then(() => this.initQuill(el.nativeElement));
    }
  }

  private hostObs?: ResizeObserver;
  private hostHeight = signal(0);

  private quill: Quill | null = null;
  body = signal('');
  sending = signal(false);
  savingConcept = signal(false);
  saveAsDraft = signal(false);
  currentConceptId = signal<string | null>(null);

  // ── Emoji shortcode autocomplete state ───────────────────────────────────────
  emojiSuggestions = signal<EmojiSuggestion[]>([]);
  emojiSelectedIndex = signal(0);
  private emojiSearchStart: number | null = null;

  private readonly toolbarOptions = [
    ['bold', 'italic', 'underline', 'strike'],
    [{ list: 'bullet' }],
    ['clean'],
  ];

  constructor() {
    effect(() => {
      const threadId = this.service.activeThreadId();
      if (!threadId) this.destroyQuill();
    });

    // Update --editor-height whenever host changes size
    effect(() => {
      const hostH = this.hostHeight();
      const editorH = Math.max(40, hostH - EDITOR_OVERHEAD_PX);
      this.hostEl.nativeElement.style.setProperty('--editor-height', `${editorH}px`);
    });

    // Observe host resize (driven by drag handle)
    this.hostObs = new ResizeObserver(entries => {
      this.zone.run(() => this.hostHeight.set(entries[0].contentRect.height));
    });
    this.hostObs.observe(this.hostEl.nativeElement);
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
                  if (this.zone.run(() => this.emojiSuggestions().length > 0)) {
                    this.zone.run(() => this.confirmEmojiSuggestion());
                    return false;
                  }
                  this.zone.run(() => this.send());
                  return false;
                },
              },
              arrowUp: {
                key: 'ArrowUp',
                handler: () => {
                  if (this.zone.run(() => this.emojiSuggestions().length > 0)) {
                    this.zone.run(() =>
                      this.emojiSelectedIndex.update(i =>
                        (i - 1 + this.emojiSuggestions().length) % this.emojiSuggestions().length
                      )
                    );
                    return false;
                  }
                  return true;
                },
              },
              arrowDown: {
                key: 'ArrowDown',
                handler: () => {
                  if (this.zone.run(() => this.emojiSuggestions().length > 0)) {
                    this.zone.run(() =>
                      this.emojiSelectedIndex.update(i =>
                        (i + 1) % this.emojiSuggestions().length
                      )
                    );
                    return false;
                  }
                  return true;
                },
              },
              escape: {
                key: 'Escape',
                handler: () => {
                  if (this.zone.run(() => this.emojiSuggestions().length > 0)) {
                    this.zone.run(() => this.clearEmojiSuggestions());
                    return false;
                  }
                  return true;
                },
              },
            },
          },
        },
        placeholder: 'Schrijf een bericht… (Enter om te versturen, : voor emoji)',
      });

      this.quill.on('text-change', () => {
        const editor = container.querySelector('.ql-editor') as HTMLElement;
        const html = editor?.innerHTML ?? '';
        this.zone.run(() => {
          this.body.set(html === '<p><br></p>' ? '' : html);
          this.handleEmojiAutocomplete();
        });
      });
    });

    // Pre-load emoji-mart data
    import('@emoji-mart/data').then(async ({ default: data }) => {
      const { init } = await import('emoji-mart');
      init({ data });
    });
  }

  private async handleEmojiAutocomplete(): Promise<void> {
    if (!this.quill) return;

    const range = this.quill.getSelection();
    if (!range) { this.clearEmojiSuggestions(); return; }

    const cursorIndex = range.index;
    const text = this.quill.getText(0, cursorIndex);

    const colonIndex = text.lastIndexOf(':');
    if (colonIndex === -1) { this.clearEmojiSuggestions(); return; }

    const query = text.slice(colonIndex + 1);

    if (query.length < 2 || query.includes(' ') || query.includes(':') || query.length > 20) {
      this.clearEmojiSuggestions();
      return;
    }

    this.emojiSearchStart = colonIndex;

    try {
      const { SearchIndex } = await import('emoji-mart');
      const results = await SearchIndex.search(query);
      const suggestions: EmojiSuggestion[] = (results ?? []).slice(0, 8).map((e: any) => ({
        id: e.id,
        native: e.skins[0].native,
        name: e.name,
      }));
      this.emojiSuggestions.set(suggestions);
      this.emojiSelectedIndex.set(0);
    } catch {
      this.clearEmojiSuggestions();
    }
  }

  confirmEmojiSuggestion(index?: number): void {
    const suggestions = this.emojiSuggestions();
    const idx = index ?? this.emojiSelectedIndex();
    const chosen = suggestions[idx];
    if (!chosen || !this.quill || this.emojiSearchStart === null) return;

    const range = this.quill.getSelection(true);
    const deleteFrom = this.emojiSearchStart;
    const deleteCount = range.index - deleteFrom;

    this.quill.deleteText(deleteFrom, deleteCount, 'user');
    this.quill.insertText(deleteFrom, chosen.native, 'user');
    this.quill.setSelection(deleteFrom + (chosen.native.length as any), 0);

    this.clearEmojiSuggestions();
  }

  clearEmojiSuggestions(): void {
    this.emojiSuggestions.set([]);
    this.emojiSelectedIndex.set(0);
    this.emojiSearchStart = null;
  }

  private destroyQuill(): void {
    this.quill = null;
    this.body.set('');
    this.saveAsDraft.set(false);
    this.currentConceptId.set(null);
    this.clearEmojiSuggestions();
  }

  ngOnDestroy(): void {
    this.destroyQuill();
    this.hostObs?.disconnect();
  }

  clearEditor(): void {
    if (!this.quill) return;
    this.quill.setContents([]);
    this.body.set('');
  }

  async send(): Promise<void> {
    if (this.saveAsDraft()) {
      await this.saveAsConcept();
    } else {
      await this._sendMessage();
    }
  }

  private async _sendMessage(): Promise<void> {
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
      const result = await this.service.saveMessageConcept(threadId, groepId, this.body(), this.currentConceptId() ?? undefined);
      this.currentConceptId.set(result.messageId);
      this.clearEditor();
      this.currentConceptId.set(null);
      this.toast.success('Concept opgeslagen.');
    } catch {
      this.toast.error('Opslaan mislukt.');
    } finally {
      this.savingConcept.set(false);
    }
  }

  loadConcept(concept: { id: string; body: string }): void {
    if (!this.quill) return;
    this.currentConceptId.set(concept.id);
    this.saveAsDraft.set(true);
    // Set Quill content from HTML
    const delta = this.quill.clipboard.convert({ html: concept.body });
    this.quill.setContents(delta, 'silent');
    const editor = this.quill.root;
    this.body.set(editor.innerHTML === '<p><br></p>' ? '' : editor.innerHTML);
    this.quill.focus();
    this.quill.setSelection(this.quill.getLength(), 0);
  }

  async publishConcept(conceptId: string): Promise<void> {
    try {
      await this.service.publishMessageConcept(conceptId);
      if (this.currentConceptId() === conceptId) {
        this.clearEditor();
        this.currentConceptId.set(null);
        this.saveAsDraft.set(false);
      }
      this.toast.success('Concept gepubliceerd.');
    } catch {
      this.toast.error('Publiceren mislukt.');
    }
  }

  async deleteConcept(conceptId: string): Promise<void> {
    try {
      await this.service.deleteMessageConcept(conceptId);
      if (this.currentConceptId() === conceptId) {
        this.clearEditor();
        this.currentConceptId.set(null);
        this.saveAsDraft.set(false);
      }
      this.toast.success('Concept verwijderd.');
    } catch {
      this.toast.error('Verwijderen mislukt.');
    }
  }
}
