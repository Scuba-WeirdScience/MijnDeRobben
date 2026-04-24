import { Component, inject, input, OnInit } from '@angular/core';
import { TabsComponent } from '../tabs.component';

/**
 * DSC Tab component — child van TabsComponent.
 *
 * Registreert zichzelf bij de parent TabsComponent via DI in OnInit.
 *
 * Usage:
 * ```html
 * <app-tabs>
 *   <app-tab id="gegevens" label="Gegevens">
 *     <app-form-field ...></app-form-field>
 *   </app-tab>
 *   <app-tab id="history" label="Geschiedenis">
 *     <app-lening-history ...></app-lening-history>
 *   </app-tab>
 * </app-tabs>
 * ```
 */
@Component({
  selector: 'app-tab',
  standalone: true,
  template: `<ng-content />`,
  host: { style: 'display: contents' },
})
export class TabComponent implements OnInit {
  readonly id    = input.required<string>();
  readonly label = input.required<string>();

  private readonly tabs = inject(TabsComponent);

  ngOnInit(): void {
    this.tabs.register(this);
  }
}
