import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { NgClass } from '@angular/common';
import { startOfMonth, startOfDay, startOfWeek, addMonths, addWeeks } from 'date-fns';
import { SpinnerComponent } from '../../../shared/components/design-system';
import { ActiviteitenService, ActiviteitDoc, ActiviteitOccurrenceDoc, ResolvedOccurrence, generateOccurrences } from '../activiteiten.service';
import { ActiviteitenAgendaComponent } from './components/activiteiten-agenda.component';
import { ActiviteitenKalenderComponent } from './components/activiteiten-kalender.component';
import { ActiviteitenWeekComponent } from './components/activiteiten-week.component';

@Component({
  selector: 'app-activiteiten-list-page',
  standalone: true,
  imports: [
    NgClass,
    SpinnerComponent,
    ActiviteitenAgendaComponent,
    ActiviteitenKalenderComponent,
    ActiviteitenWeekComponent,
  ],
  templateUrl: './activiteiten-list-page.component.html',
})
export class ActiviteitenListPageComponent implements OnInit {
  private readonly service = inject(ActiviteitenService);

  readonly viewMode = signal<'agenda' | 'maand' | 'week'>('agenda');
  readonly kalenderMaand = signal(startOfMonth(new Date()));
  readonly kalenderWeek = signal(startOfWeek(new Date(), { weekStartsOn: 1 }));
  readonly activiteiten = signal<ActiviteitDoc[]>([]);
  readonly overrides = signal<ActiviteitOccurrenceDoc[]>([]);
  readonly loading = signal(false);

  readonly occurrences = computed((): ResolvedOccurrence[] => {
    const mode = this.viewMode();
    const today = new Date();
    let van: Date, tot: Date;
    if (mode === 'agenda') {
      van = startOfDay(today);
      tot = addMonths(today, 6);
    } else if (mode === 'week') {
      van = this.kalenderWeek();
      tot = addWeeks(this.kalenderWeek(), 1);
    } else {
      van = this.kalenderMaand();
      tot = addMonths(this.kalenderMaand(), 1);
    }
    return generateOccurrences(this.activiteiten(), van, tot, this.overrides());
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.service.getActiviteiten().subscribe({
      next: list => {
        this.activiteiten.set(list);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
    this.service.getAllOccurrenceOverrides().subscribe({
      next: list => this.overrides.set(list),
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      error: () => {},
    });
  }

  setViewMode(mode: 'agenda' | 'maand' | 'week'): void {
    this.viewMode.set(mode);
  }

  onMaandGewijzigd(maand: Date): void {
    this.kalenderMaand.set(maand);
  }

  onWeekGewijzigd(week: Date): void {
    this.kalenderWeek.set(week);
  }
}
