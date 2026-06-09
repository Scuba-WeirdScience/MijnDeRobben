import { Component, input, ChangeDetectionStrategy } from '@angular/core';

/**
 * Single shimmer bar. Use [width] and [height] to size it.
 * Default: full-width, h-4, rounded.
 */
@Component({
  selector: 'app-skeleton',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './skeleton.component.html',
})
export class SkeletonComponent {
  readonly width = input<string>('100%');
  readonly height = input<string>('1rem');
  readonly rounded = input<string>('rounded');
}
