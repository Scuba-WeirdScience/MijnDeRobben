import {
  Component,
  input,
  output,
  TemplateRef,
  signal,
  inject,
  PLATFORM_ID,
  OnDestroy,
  ChangeDetectionStrategy,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { NgTemplateOutlet } from '@angular/common';
import { LucideX } from '../../lucide-icons';

const MIN_WIDTH = 320;

@Component({
  selector: 'app-side-panel',
  standalone: true,
  imports: [NgTemplateOutlet, LucideX],
  templateUrl: './side-panel.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  host: { style: 'display: block' },
})
export class SidePanelComponent implements OnDestroy {
  readonly title = input.required<string>();
  readonly subtitle = input<string | undefined>(undefined);
  readonly size = input<'sm' | 'md' | 'lg' | 'xl'>('md');
  readonly closed = output<void>();
  readonly headerActions = input<TemplateRef<unknown> | null>(null);
  /** Optional guard. Return false to block closing (handle confirmation in consumer). */
  readonly canClose = input<(() => boolean) | null>(null);

  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  /** Width set by dragging — null means use CSS max-w-* from the host element. */
  readonly panelWidth = signal<number | null>(null);

  private dragging = false;
  private startX = 0;
  private startW = 0;
  private readonly onMouseMove = (e: MouseEvent) => this.handleDrag(e);
  private readonly onMouseUp = () => this.stopDrag();

  requestClose(): void {
    const guard = this.canClose();
    if (guard && !guard()) return;
    this.closed.emit();
  }

  startDrag(e: MouseEvent): void {
    if (!this.isBrowser) return;
    e.preventDefault();
    this.dragging = true;
    this.startX = e.clientX;
    this.startW = this.currentWidth();
    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('mouseup', this.onMouseUp);
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'ew-resize';
  }

  private handleDrag(e: MouseEvent): void {
    if (!this.dragging) return;
    const maxWidth = Math.round(window.innerWidth * 0.95);
    const delta = this.startX - e.clientX; // dragging left = wider
    const next = Math.min(maxWidth, Math.max(MIN_WIDTH, this.startW + delta));
    this.panelWidth.set(next);
  }

  private stopDrag(): void {
    if (!this.dragging) return;
    this.dragging = false;
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('mouseup', this.onMouseUp);
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
  }

  ngOnDestroy(): void {
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('mouseup', this.onMouseUp);
  }

  private currentWidth(): number {
    return this.panelWidth() ?? this.defaultWidth();
  }

  private defaultWidth(): number {
    const s = this.size();
    if (s === 'sm') return 384;
    if (s === 'lg') return 672;
    if (s === 'xl') return 896;
    return 512; // md
  }
}
