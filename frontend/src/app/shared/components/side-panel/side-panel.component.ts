import { Component, input, output, TemplateRef } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { LucideX } from '../../lucide-icons';

@Component({
  selector: 'app-side-panel',
  standalone: true,
  imports: [NgTemplateOutlet, LucideX],
  templateUrl: './side-panel.component.html',
  host: { style: 'display: block' },
})
export class SidePanelComponent {
  readonly title         = input.required<string>();
  readonly subtitle      = input<string | undefined>(undefined);
  readonly size          = input<'sm' | 'md' | 'lg' | 'xl'>('md');
  readonly closed        = output<void>();
  readonly headerActions = input<TemplateRef<unknown> | null>(null);
}
