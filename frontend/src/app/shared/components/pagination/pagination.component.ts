import { Component, computed, input, output, ChangeDetectionStrategy } from '@angular/core';

/**
 * DSC Pagination component.
 *
 * Toont paginering met ellipsis voor grote datasets.
 * Verbergt zichzelf automatisch als er slechts 1 pagina is.
 *
 * Usage:
 * ```html
 * <app-pagination
 *   [total]="totalMembers()"
 *   [page]="page()"
 *   [pageSize]="20"
 *   (pageChange)="page.set($event)"
 * />
 * ```
 */
@Component({
  selector: 'app-pagination',
  standalone: true,
  template: `
    @if (totalPages() > 1) {
    <nav class="flex items-center justify-between gap-2 text-sm" aria-label="Paginering">
      <span class="text-gray-500 dark:text-gray-400 text-xs"> {{ total() }} totaal </span>

      <div class="flex items-center gap-1">
        <!-- Vorige -->
        <button
          (click)="pageChange.emit(page() - 1)"
          [disabled]="!hasPrev()"
          class="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600
                         text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800
                         disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-xs"
        >
          ← Vorige
        </button>

        <!-- Paginanummers -->
        @for (p of pages(); track $index) { @if (p === '...') {
        <span class="px-2 py-1 text-gray-400 dark:text-gray-500 select-none">…</span>
        } @else {
        <button
          (click)="pageChange.emit(+p)"
          [attr.aria-current]="page() === +p ? 'page' : null"
          class="min-w-[2rem] px-2 py-1.5 rounded-lg text-xs font-medium transition-colors"
          [class.bg-scuba-600]="page() === +p"
          [class.text-white]="page() === +p"
          [class.border]="page() !== +p"
          [class.border-gray-300]="page() !== +p"
          [class.dark:border-gray-600]="page() !== +p"
          [class.text-gray-700]="page() !== +p"
          [class.dark:text-gray-300]="page() !== +p"
          [class.hover:bg-gray-50]="page() !== +p"
          [class.dark:hover:bg-gray-800]="page() !== +p"
        >
          {{ p }}
        </button>
        } }

        <!-- Volgende -->
        <button
          (click)="pageChange.emit(page() + 1)"
          [disabled]="!hasNext()"
          class="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600
                         text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800
                         disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-xs"
        >
          Volgende →
        </button>
      </div>
    </nav>
    }
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  host: { style: 'display: block' },
})
export class PaginationComponent {
  readonly total = input.required<number>();
  readonly page = input.required<number>();
  readonly pageSize = input<number>(20);
  readonly pageChange = output<number>();

  readonly totalPages = computed(() => Math.ceil(this.total() / this.pageSize()));
  readonly hasPrev = computed(() => this.page() > 1);
  readonly hasNext = computed(() => this.page() < this.totalPages());

  readonly pages = computed((): (number | '...')[] => {
    const total = this.totalPages();
    const current = this.page();
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    const result: (number | '...')[] = [1];
    if (current > 3) result.push('...');
    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);
    for (let i = start; i <= end; i++) result.push(i);
    if (current < total - 2) result.push('...');
    result.push(total);
    return result;
  });
}
