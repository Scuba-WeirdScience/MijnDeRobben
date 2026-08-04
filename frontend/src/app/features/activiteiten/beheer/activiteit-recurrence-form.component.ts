import {
  Component,
  input,
  output,
  signal,
  computed,
  effect,
  ChangeDetectionStrategy,
} from '@angular/core';
import { NgClass } from '@angular/common';
import {
  FormFieldComponent,
  InputComponent,
  SelectComponent,
} from '../../../shared/components/design-system';
import { RecurrenceExclusionPeriod, RecurrenceRule, RecurrenceFrequency } from '../activiteiten.service';

@Component({
  selector: 'app-activiteit-recurrence-form',
  standalone: true,
  imports: [NgClass, FormFieldComponent, InputComponent, SelectComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './activiteit-recurrence-form.component.html',
})
export class ActiviteitRecurrenceFormComponent {
  readonly rule = input<RecurrenceRule | null>(null);
  readonly ruleGewijzigd = output<RecurrenceRule>();

  readonly frequency = signal<RecurrenceFrequency>('weekly');
  readonly interval = signal(1);
  readonly daysOfWeek = signal<number[]>([]);
  readonly monthlyDayOccurrence = signal(1);
  readonly monthlyDayOfWeek = signal(1);
  readonly endsType = signal<'nooit' | 'op' | 'na'>('nooit');
  readonly endsOn = signal('');
  readonly endsAfter = signal(10);
  readonly exclusionPeriods = signal<RecurrenceExclusionPeriod[]>([]);

  readonly dagNamen = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'];
  readonly dagWaarden = [0, 1, 2, 3, 4, 5, 6];

  readonly frequentieOpties = [
    { value: 'daily', label: 'Dagelijks' },
    { value: 'weekly', label: 'Wekelijks' },
    { value: 'monthly-date', label: 'Maandelijks (zelfde datum)' },
    { value: 'monthly-day', label: 'Maandelijks (zelfde dag)' },
    { value: 'yearly', label: 'Jaarlijks' },
  ];

  readonly occurrenceOpties = [
    { value: '1', label: 'Eerste' },
    { value: '2', label: 'Tweede' },
    { value: '3', label: 'Derde' },
    { value: '4', label: 'Vierde' },
    { value: '5', label: 'Laatste' },
  ];

  readonly weekdagOpties = [
    { value: '0', label: 'Zondag' },
    { value: '1', label: 'Maandag' },
    { value: '2', label: 'Dinsdag' },
    { value: '3', label: 'Woensdag' },
    { value: '4', label: 'Donderdag' },
    { value: '5', label: 'Vrijdag' },
    { value: '6', label: 'Zaterdag' },
  ];

  readonly isWeekly = computed(() => this.frequency() === 'weekly');
  readonly isMonthlyDay = computed(() => this.frequency() === 'monthly-day');

  numToStr(v: number): string {
    return String(v);
  }

  constructor() {
    effect(
      () => {
        const r = this.rule();
        if (!r) return;
        this.frequency.set(r.frequency);
        this.interval.set(r.interval ?? 1);
        this.daysOfWeek.set(r.daysOfWeek ?? []);
        this.monthlyDayOccurrence.set(r.monthlyDayOccurrence ?? 1);
        this.monthlyDayOfWeek.set(r.monthlyDayOfWeek ?? 1);
        this.exclusionPeriods.set(r.exclusionPeriods ?? []);
        if (r.endsOn) {
          this.endsType.set('op');
          this.endsOn.set(r.endsOn);
        } else if (r.endsAfter) {
          this.endsType.set('na');
          this.endsAfter.set(r.endsAfter);
        } else {
          this.endsType.set('nooit');
        }
      },
      { }
    );
  }

  private emit(): void {
    const rule: RecurrenceRule = {
      frequency: this.frequency(),
      interval: this.interval(),
    };
    if (this.isWeekly() && this.daysOfWeek().length > 0) {
      rule.daysOfWeek = this.daysOfWeek();
    }
    if (this.isMonthlyDay()) {
      rule.monthlyDayOccurrence = this.monthlyDayOccurrence();
      rule.monthlyDayOfWeek = this.monthlyDayOfWeek();
    }
    if (this.endsType() === 'op' && this.endsOn()) {
      rule.endsOn = this.endsOn();
    } else if (this.endsType() === 'na') {
      rule.endsAfter = this.endsAfter();
    }
    const exclusionPeriods = this.exclusionPeriods().filter(period =>
      !!period.startDate && !!period.endDate && period.startDate < period.endDate,
    );
    if (exclusionPeriods.length > 0) {
      rule.exclusionPeriods = exclusionPeriods;
    }
    this.ruleGewijzigd.emit(rule);
  }

  onFrequencyChange(value: string): void {
    this.frequency.set(value as RecurrenceFrequency);
    this.emit();
  }

  onIntervalChange(value: string): void {
    this.interval.set(Math.max(1, parseInt(value) || 1));
    this.emit();
  }

  toggleDayOfWeek(dag: number): void {
    const current = this.daysOfWeek();
    if (current.includes(dag)) {
      this.daysOfWeek.set(current.filter((d) => d !== dag));
    } else {
      this.daysOfWeek.set([...current, dag].sort());
    }
    this.emit();
  }

  isDagGeselecteerd(dag: number): boolean {
    return this.daysOfWeek().includes(dag);
  }

  onMonthlyOccurrenceChange(value: string): void {
    this.monthlyDayOccurrence.set(parseInt(value) || 1);
    this.emit();
  }

  onMonthlyDayOfWeekChange(value: string): void {
    this.monthlyDayOfWeek.set(parseInt(value) || 1);
    this.emit();
  }

  onEndsTypeChange(value: string): void {
    this.endsType.set(value as 'nooit' | 'op' | 'na');
    this.emit();
  }

  onEndsOnChange(value: string): void {
    this.endsOn.set(value);
    this.emit();
  }

  onEndsAfterChange(value: string): void {
    this.endsAfter.set(Math.max(1, parseInt(value) || 1));
    this.emit();
  }

  voegUitsluitingsperiodeToe(): void {
    this.exclusionPeriods.update(periods => [...periods, { startDate: '', endDate: '' }]);
    this.emit();
  }

  verwijderUitsluitingsperiode(index: number): void {
    this.exclusionPeriods.update(periods => periods.filter((_, i) => i !== index));
    this.emit();
  }

  onUitsluitingStartChange(index: number, value: string): void {
    this.exclusionPeriods.update(periods => periods.map((period, i) =>
      i === index ? { ...period, startDate: value } : period,
    ));
    this.emit();
  }

  onUitsluitingEndChange(index: number, value: string): void {
    this.exclusionPeriods.update(periods => periods.map((period, i) =>
      i === index ? { ...period, endDate: value } : period,
    ));
    this.emit();
  }
}
