import { Component, input } from '@angular/core';

@Component({
  selector: 'app-spinner',
  standalone: true,
  templateUrl: './spinner.component.html',
})
export class SpinnerComponent {
  readonly size     = input<'sm' | 'md' | 'lg'>('md');
  readonly fullPage = input(false);
}
