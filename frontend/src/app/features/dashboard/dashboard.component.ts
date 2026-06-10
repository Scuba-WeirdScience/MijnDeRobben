import {
  Component,
  inject,
  signal,
  computed,
  OnInit,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CdkDragDrop, moveItemInArray, DragDropModule } from '@angular/cdk/drag-drop';
import { RouterLink } from '@angular/router';
import { NgClass } from '@angular/common';
import { forkJoin } from 'rxjs';
import { ButtonComponent, BadgeComponent } from '../../shared/components/design-system';
import { LUCIDE_ICONS } from '../../shared/lucide-icons';
import { LocaleDateTimePipe } from '../../shared/pipes/locale-datetime.pipe';
import { ThemeService } from '../../core/services/theme.service';
import { DashboardWidgetConfig } from '../../core/models/firestore-types';
import { AVAILABLE_WIDGETS, ALL_WIDGET_IDS } from './widget-registry';
import { LeningService, LeningDoc } from '../lening/lening.service';
import {
  ActiviteitenService,
  ActiviteitDoc,
  ActiviteitOccurrenceDoc,
  ActiviteitRegistratieDoc,
  ResolvedOccurrence,
  generateOccurrences,
} from '../activiteiten/activiteiten.service';

// ── Tailwind safelist ─────────────────────────────────────────────────────
const _TW_SAFELIST = [
  'grid-cols-1',
  'lg:grid-cols-2',
  'translate-x-1',
  '-translate-x-1',
  '-translate-y-1',
  'translate-y-1',
  'translate-x-2',
  '-translate-x-2',
  '-translate-y-2',
  'translate-y-2',
  'opacity-40',
  'border-dashed',
];

// ── Legacy localStorage key ───────────────────────────────────────────────
const LEGACY_WIDGET_ORDER_KEY = 'dashboard-widget-order';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    RouterLink,
    DragDropModule,
    NgClass,
    ButtonComponent,
    BadgeComponent,
    ...LUCIDE_ICONS,
    LocaleDateTimePipe,
  ],
  styles: [
    `
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
    `,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {
  private readonly themeService = inject(ThemeService);
  private readonly leningService = inject(LeningService);
  private readonly activiteitenService = inject(ActiviteitenService);

  // ── Data signals ────────────────────────────────────────────────────────
  readonly loading = signal(true);
  readonly fout = signal<string | null>(null);
  readonly mijnLeningen = signal<LeningDoc[]>([]);
  readonly activiteiten = signal<ActiviteitDoc[]>([]);
  readonly overrides = signal<ActiviteitOccurrenceDoc[]>([]);
  readonly mijnRegistraties = signal<ActiviteitRegistratieDoc[]>([]);

  // ── Edit mode ───────────────────────────────────────────────────────────
  readonly isEditMode = signal(false);
  private readonly editConfig = signal<DashboardWidgetConfig[] | null>(null);
  readonly showAddWidget = signal(false);

  /** Default config when nothing is saved yet */
  private readonly _defaultWidgetConfig: DashboardWidgetConfig[] = ALL_WIDGET_IDS.map(
    (id) => ({ id, visible: true, collapsed: false }),
  );

  /** Active widget config: edit copy during edit mode, otherwise from ThemeService */
  readonly widgetConfig = computed<DashboardWidgetConfig[]>(() => {
    const saved = this.themeService.dashboardWidgets();
    return this.editConfig() ?? (saved.length > 0 ? saved : this._defaultWidgetConfig);
  });

  /** Widget types that can still be added (not yet in config) */
  readonly availableWidgetsNotOnDashboard = computed(() => {
    const currentIds = new Set(this.widgetConfig().map((w) => w.id));
    return ALL_WIDGET_IDS.filter((id) => !currentIds.has(id));
  });

  // ── Derived data ────────────────────────────────────────────────────────
  readonly alleenOpenLeningen = computed(() =>
    this.mijnLeningen().filter((l) => l.retourdatum === null),
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
      .filter((o) => new Date(o.startDatumTijd) >= van)
      .sort(
        (a, b) =>
          new Date(a.startDatumTijd).getTime() - new Date(b.startDatumTijd).getTime(),
      )
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

  // ── Helpers consumed by template ────────────────────────────────────────
  readonly AVAILABLE_WIDGETS = AVAILABLE_WIDGETS;

  getWidgetTitle(id: string): string {
    return AVAILABLE_WIDGETS[id]?.title ?? id;
  }

  isIngeschreven(occ: ResolvedOccurrence): boolean {
    return this.ingeschrevenMap().has(`${occ.activiteitId}|${occ.occurrenceDatum}`);
  }

  // ── Lifecycle ───────────────────────────────────────────────────────────
  ngOnInit(): void {
    this._migrateLegacyLocalStorage();
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

  // ── Edit mode actions ───────────────────────────────────────────────────
  toggleEditMode(): void {
    if (this.isEditMode()) {
      // Already in edit mode — do nothing, user must use Save/Cancel
      return;
    }
    // Snapshot current config into working copy
    this.editConfig.set(
      JSON.parse(JSON.stringify(this.themeService.dashboardWidgets())),
    );
    this.isEditMode.set(true);
    this.showAddWidget.set(false);
  }

  save(): void {
    const config = this.editConfig();
    if (config) {
      this.themeService.setDashboardWidgets(config);
    }
    this._exitEditMode();
  }

  cancel(): void {
    this._exitEditMode();
  }

  private _exitEditMode(): void {
    this.editConfig.set(null);
    this.isEditMode.set(false);
    this.showAddWidget.set(false);
  }

  addWidget(id: string): void {
    const config = [...(this.editConfig() ?? this.themeService.dashboardWidgets())];
    config.push({ id, visible: true, collapsed: false });
    this.editConfig.set(config);
    this.showAddWidget.set(false);
  }

  removeWidget(id: string): void {
    const config = (this.editConfig() ?? []).filter((w) => w.id !== id);
    this.editConfig.set(config);
  }

  toggleVisibility(id: string): void {
    const config = (this.editConfig() ?? this.themeService.dashboardWidgets()).map(
      (w) => (w.id === id ? { ...w, visible: !w.visible } : w),
    );
    this.editConfig.set(config);
  }

  toggleCollapse(id: string): void {
    const source = this.isEditMode()
      ? this.editConfig() ?? []
      : this.themeService.dashboardWidgets();

    const updated = source.map((w) =>
      w.id === id ? { ...w, collapsed: !w.collapsed } : w,
    );

    if (this.isEditMode()) {
      this.editConfig.set(updated);
    } else {
      // In view mode, persist immediately
      this.themeService.setDashboardWidgets(updated);
    }
  }

  drop(event: CdkDragDrop<DashboardWidgetConfig[]>): void {
    if (!this.isEditMode()) return;
    const config = [...(this.editConfig() ?? [])];
    moveItemInArray(config, event.previousIndex, event.currentIndex);
    this.editConfig.set(config);
  }

  // ── Migration ───────────────────────────────────────────────────────────
  private _migrateLegacyLocalStorage(): void {
    try {
      const old = localStorage.getItem(LEGACY_WIDGET_ORDER_KEY);
      if (!old) return;

      const parsed: unknown = JSON.parse(old);
      if (
        Array.isArray(parsed) &&
        parsed.every((w: unknown) => w === 'leningen' || w === 'activiteiten')
      ) {
        const converted: DashboardWidgetConfig[] = (parsed as string[]).map((id) => ({
          id,
          visible: true,
          collapsed: false,
        }));
        this.themeService.setDashboardWidgets(converted);
      }
      localStorage.removeItem(LEGACY_WIDGET_ORDER_KEY);
    } catch {
      // Ignore migration errors
    }
  }
}
