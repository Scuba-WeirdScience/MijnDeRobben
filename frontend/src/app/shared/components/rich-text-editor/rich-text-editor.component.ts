import {
  Component,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnDestroy,
  NgZone,
  input,
  model,
  inject,
  ChangeDetectionStrategy,
} from '@angular/core';
import { NgClass } from '@angular/common';
import Quill from 'quill';

// Tailwind safelist — do NOT remove
const _TW_SAFELIST = [
  'border-gray-300',
  'dark:border-gray-600',
  'border-red-500',
  'dark:border-red-400',
];

@Component({
  selector: 'app-rich-text-editor',
  standalone: true,
  imports: [NgClass],
  templateUrl: './rich-text-editor.component.html',
  styleUrl: './rich-text-editor.component.css',
  changeDetection: ChangeDetectionStrategy.Eager,
  host: { style: 'display: block' },
})
export class RichTextEditorComponent implements AfterViewInit, OnDestroy {
  @ViewChild('container') container!: ElementRef<HTMLDivElement>;

  readonly value = model<string>('');
  readonly disabled = input<boolean>(false);
  readonly invalid = input<boolean>(false);
  readonly placeholder = input<string>('');

  private quill: Quill | null = null;
  private readonly zone = inject(NgZone);

  private readonly toolbarOptions = [
    ['bold', 'italic', 'underline', 'strike'],
    ['blockquote'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['link'],
    ['clean'],
  ];

  ngAfterViewInit(): void {
    this.zone.runOutsideAngular(() => {
      this.quill = new Quill(this.container.nativeElement, {
        theme: 'snow',
        modules: { toolbar: this.toolbarOptions },
        placeholder: this.placeholder(),
        readOnly: this.disabled(),
      });

      const initial = this.value();
      if (initial) {
        this.quill.clipboard.dangerouslyPasteHTML(initial);
      }

      this.quill.on('text-change', () => {
        const editor = this.container.nativeElement.querySelector('.ql-editor') as HTMLElement;
        const html = editor?.innerHTML ?? '';
        this.zone.run(() => {
          this.value.set(html === '<p><br></p>' ? '' : html);
        });
      });
    });
  }

  ngOnDestroy(): void {
    this.quill = null;
  }
}
