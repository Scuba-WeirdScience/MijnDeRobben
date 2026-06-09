import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { SkeletonComponent } from './skeleton.component';

/**
 * Skeleton for a table list: header bar + N body rows.
 * Each row has 3 columns of varying widths.
 */
@Component({
  selector: 'app-skeleton-table',
  standalone: true,
  imports: [SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './skeleton-table.component.html',
})
export class SkeletonTableComponent {
  readonly rows = input<number>(6);

  get items(): number[] {
    return Array.from({ length: this.rows() }, (_, i) => i);
  }
}
