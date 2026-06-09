import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CdkDragDrop, moveItemInArray, DragDropModule } from '@angular/cdk/drag-drop';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { BadgeComponent } from '../../shared/components/design-system';
import { LUCIDE_ICONS } from '../../shared/lucide-icons';
import { LocaleDateTimePipe } from '../../shared/pipes/locale-datetime.pipe';
import { LeningService, LeningDoc } from '../lening/lening.service';
import {
  ActiviteitenService,
  ActiviteitDoc,
  ActiviteitOccurrenceDoc,
  ActiviteitRegistratieDoc,
  ResolvedOccurrence,
  generateOccurrences,
} from '../activiteiten/activiteiten.service';

const _TW_SAFELIST = [
  'grid-cols-1', 'lg:grid-cols-2',
  'translate-x-1', '-translate-x-1',
  '-translate-y-1', 'translate-y-1',
  'translate-x-2', '-translate-x-2',
  '-translate-y-2', 'translate-y-2',
];

const WIDGET_ORDER_KEY = 'dashboard-widget-order';
const DEFAULT_WIDGET_ORDER = ['leningen', 'activiteiten'];

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    RouterLink,
    DragDropModule,
    BadgeComponent,
    ...LUCIDE_ICONS,
    LocaleDateTimePipe,
  ],
  styles: [`
    .cdk-drag-preview {
      opacity: 0.85;
      transform: rotate(2deg);
    }
    .cdk-drag-placeholder {
      opacity: 0;
    }
    .cdk-drop-list-dragging .cdk-drag:not(.cdk-drag-placeholder) {
      transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
    }
    .cdk-drag-animating {
      transition: transform 300ms cubic-bezier(0, 0, 0.2, 1);
    }
  `],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {
  private readonly leningService = inject(LeningService);
  private readonly activiteitenService = inject(ActiviteitenService);

  readonly loading = signal(true);
  readonly fout = signal<string | null>(null);
  readonly mijnLeningen = signal<LeningDoc[]>([]);
  readonly activiteiten = signal<ActiviteitDoc[]>([]);
  readonly overrides = signal<ActiviteitOccurrenceDoc[]>([]);
  readonly mijnRegistraties = signal<ActiviteitRegistratieDoc[]>([]);
  readonly widgetOrder = signal<string[]>(this.leesWidgetOrder());

  readonly alleenOpenLeningen = computed(() =>
    this.mijnLeningen().filter(l => l.retourdatum === null)
  );

  readonly upcomingOccurrences = computed((): ResolvedOccurrence[] => {
    const activiteiten = this.activiteiten();
    const overrides = this.overrides();
    if (activiteiten.length === 0) return [];
    const van = new Date();
    const tot = new Date();
    tot.setMonth(tot.getMonth() + 6);
    const all = generateOccurrences(activiteiten, van, tot, overrides);
    return all
      .filter(o => new Date(o.startDatumTijd) >= van)
      .sort((a, b) => new Date(a.startDatumTijd).getTime() - new Date(b.startDatumTijd).getTime())
      .slice(0, 5);
  });

  readonly ingeschrevenMap = computed(() => {
    const registraties = this.mijnRegistraties();
    const map = new Map<string, true>();
    for (const reg of registraties) {
      if (reg.status === 'aangemeld') {
        map.set(`${reg.activiteitId}|${reg.occurrenceDatum}`, true);
      }
    }
    return map;
  });

  isIngeschreven(occ: ResolvedOccurrence): boolean {
    return this.ingeschrevenMap().has(`${occ.activiteitId}|${occ.occurrenceDatum}`);
  }

  ngOnInit(): void {
    this.loadData();
  }

  private loadData(): void {
    this.loading.set(true);
    this.fout.set(null);

    forkJoin({
      leningen: this.leningService.getMyLeningen(),
      activiteiten: this.activiteitenService.getActiviteiten(),
      overrides: this.activiteitenService.getAllOccurrenceOverrides(),
      registraties: this.activiteitenService.getMijnRegistraties(),
    }).subscribe({
      next: ({ leningen, activiteiten, overrides, registraties }) => {
        this.mijnLeningen.set(leningen);
        this.activiteiten.set(activiteiten);
        this.overrides.set(overrides);
        this.mijnRegistraties.set(registraties);
        this.loading.set(false);
      },
      error: () => {
        this.fout.set('Er is een fout opgetreden bij het laden van het dashboard.');
        this.loading.set(false);
      },
    });
  }

  drop(event: CdkDragDrop<string[]>): void {
    const order = [...this.widgetOrder()];
    moveItemInArray(order, event.previousIndex, event.currentIndex);
    this.widgetOrder.set(order);
    localStorage.setItem(WIDGET_ORDER_KEY, JSON.stringify(order));
  }

  private leesWidgetOrder(): string[] {
    try {
      const saved = localStorage.getItem(WIDGET_ORDER_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.every((w: unknown) => w === 'leningen' || w === 'activiteiten')) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return DEFAULT_WIDGET_ORDER;
  }
}
