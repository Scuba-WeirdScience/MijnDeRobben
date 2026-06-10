import { Component, computed, input, output, ChangeDetectionStrategy } from '@angular/core';
import { HlmPaginationImports } from '@spartan-ng/helm/pagination';

@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [...HlmPaginationImports],
  templateUrl: './pagination.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display: block' },
})
export class PaginationComponent {
  readonly total = input.required<number>();
  readonly page = input.required<number>();
  readonly pageSize = input<number>(20);
  readonly pageChange = output<number>();

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize())));
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
