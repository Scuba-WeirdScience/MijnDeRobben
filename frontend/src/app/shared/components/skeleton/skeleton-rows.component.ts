import { Component, input } from '@angular/core';
import { SkeletonComponent } from './skeleton.component';

/**
 * A skeleton row: avatar circle + two lines of text.
 * Mimics a typical list-item row.
 * [rows] controls how many rows to render (default 5).
 */
@Component({
  selector: 'app-skeleton-rows',
  standalone: true,
  imports: [SkeletonComponent],
  templateUrl: './skeleton-rows.component.html',
})
export class SkeletonRowsComponent {
  readonly rows = input<number>(5);

  get items(): number[] {
    return Array.from({ length: this.rows() }, (_, i) => i);
  }
}
