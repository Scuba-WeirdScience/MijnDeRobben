import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';

/**
 * Single shimmer bar. Use [width] and [height] to size it.
 * Default: full-width, h-4, rounded.
 */
@Component({
  selector: 'app-skeleton',
  standalone: true,
  imports: [...HlmSkeletonImports],
  template: `
    <div
      hlmSkeleton
      [style.width]="width()"
      [style.height]="height()"
      [class]="rounded()"
    ></div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SkeletonComponent {
  readonly width = input<string>('100%');
  readonly height = input<string>('1rem');
  readonly rounded = input<string>('rounded');
}
