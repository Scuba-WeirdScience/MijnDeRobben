import { Component, computed, signal } from '@angular/core';
import { TabComponent } from './tab/tab.component';

/**
 * DSC Tabs component.
 *
 * Beheert de actieve tab via signals. Child TabComponents registreren
 * zichzelf via DI (inject(TabsComponent).register(this)) in hun ngOnInit.
 *
 * Usage:
 * ```html
 * <app-tabs>
 *   <app-tab id="details" label="Details">...</app-tab>
 *   <app-tab id="history" label="Geschiedenis">...</app-tab>
 * </app-tabs>
 * ```
 */
@Component({
  selector: 'app-tabs',
  standalone: true,
  templateUrl: './tabs.component.html',
  host: { style: 'display: block' },
})
export class TabsComponent {
  readonly tabs        = signal<TabComponent[]>([]);
  readonly activeTabId = signal<string>('');

  register(tab: TabComponent): void {
    this.tabs.update(existing => {
      if (existing.some(t => t.id() === tab.id())) return existing;
      return [...existing, tab];
    });
    if (!this.activeTabId()) {
      this.activeTabId.set(tab.id());
    }
  }

  activate(id: string): void {
    this.activeTabId.set(id);
  }

  readonly activeTab = computed(() =>
    this.tabs().find(t => t.id() === this.activeTabId()) ?? null
  );
}
