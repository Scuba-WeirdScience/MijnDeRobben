import { Injectable } from '@angular/core';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@fire';
import { from, Observable } from 'rxjs';
import {
  addDays,
  addWeeks,
  addMonths,
  addYears,
  parseISO,
  format,
  isBefore,
  isAfter,
  startOfDay,
  getDay,
  getDate,
  setDay,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
} from 'date-fns';

// ── Domain types (mirror functions/src/shared/types.ts) ───────────────────────

export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly-date' | 'monthly-day' | 'yearly';

export interface RecurrenceRule {
  frequency: RecurrenceFrequency;
  interval: number;
  daysOfWeek?: number[];
  monthlyDayOccurrence?: number;
  monthlyDayOfWeek?: number;
  endsOn?: string | null;
  endsAfter?: number | null;
}

export type RegistratiesZichtbaar = 'iedereen' | 'aangemeld' | 'beheer';

export interface LocatieDoc {
  id: string;
  naam: string;
  adres: string | null;
  kaartLink: string | null;
  notities: string | null;
  createdAt: string;
  updatedAt: string | null;
}

export interface ActiviteitDoc {
  id: string;
  titel: string;
  beschrijving: string | null;
  startDatumTijd: string;
  eindDatumTijd: string;
  locatieId: string | null;
  locatieNaam: string | null;
  locatieVrij: string | null;
  bannerUrl: string | null;
  organisatorId: string | null;
  organisatorNaam: string | null;
  organisatorLeden: string[];
  organisatorGroepId: string | null;
  inschrijvingenActief: boolean;
  maxDeelnemers: number | null;
  registratiesZichtbaar: RegistratiesZichtbaar;
  gasten: boolean;
  maxGastenPerInschrijving: number | null;
  gastKosten: number | null;
  lidKosten: number | null;
  isHerhalend: boolean;
  recurrenceRule: RecurrenceRule | null;
  isPubliek: boolean;
  threadId: string | null;
  groepId: string | null;
  createdAt: string;
  updatedAt: string | null;
  createdByUid: string;
}

export type OccurrenceStatus = 'modified' | 'cancelled';

export interface ActiviteitOccurrenceDoc {
  id: string;
  activiteitId: string;
  occurrenceDatum: string;
  status: OccurrenceStatus;
  titel?: string;
  beschrijving?: string | null;
  startDatumTijd?: string;
  eindDatumTijd?: string;
  locatieId?: string | null;
  locatieNaam?: string | null;
  bannerUrl?: string | null;
  maxDeelnemers?: number | null;
  notitie?: string | null;
  createdAt: string;
  updatedAt: string | null;
}

export interface ActiviteitRegistratieDoc {
  id: string;
  activiteitId: string;
  occurrenceDatum: string;
  memberId: string;
  memberUid: string;
  memberNaam: string;
  aantalGasten: number;
  opmerking: string | null;
  status: 'aangemeld' | 'afgemeld' | 'aanwezig';
  createdAt: string;
  updatedAt: string | null;
}

/** A fully resolved occurrence — ready for rendering */
export interface ResolvedOccurrence {
  activiteitId: string;
  occurrenceDatum: string;       // yyyy-MM-dd (originele datum)
  isOverridden: boolean;
  titel: string;
  beschrijving: string | null;
  startDatumTijd: string;
  eindDatumTijd: string;
  locatieId: string | null;
  locatieNaam: string | null;
  locatieVrij: string | null;
  bannerUrl: string | null;
  maxDeelnemers: number | null;
  inschrijvingenActief: boolean;
  registratiesZichtbaar: RegistratiesZichtbaar;
  gasten: boolean;
  maxGastenPerInschrijving: number | null;
  gastKosten: number | null;
  lidKosten: number | null;
  organisatorId: string | null;
  organisatorNaam: string | null;
  organisatorLeden: string[];
  organisatorGroepId: string | null;
  threadId: string | null;
  groepId: string | null;
  isPubliek: boolean;
}

export type EditScope = 'single' | 'future' | 'all';

// ── Request / Response types ──────────────────────────────────────────────────

export type CreateLocatieRequest = Omit<LocatieDoc, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateLocatieRequest = Partial<CreateLocatieRequest>;
export type CreateActiviteitRequest = Omit<ActiviteitDoc, 'id' | 'createdAt' | 'updatedAt' | 'createdByUid'>;
export type UpdateActiviteitRequest = {
  id: string;
  scope: EditScope;
  occurrenceDatum?: string;
} & Partial<ActiviteitDoc>;
export type DeleteActiviteitRequest = { id: string; scope: EditScope; occurrenceDatum?: string };

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class ActiviteitenService {

  // ── Locaties ────────────────────────────────────────────────────────────

  getLocaties(): Observable<LocatieDoc[]> {
    const fn = httpsCallable<void, LocatieDoc[]>(functions, 'getLocaties');
    return from(fn().then(r => r.data));
  }

  createLocatie(dto: CreateLocatieRequest): Observable<LocatieDoc> {
    const fn = httpsCallable<CreateLocatieRequest, LocatieDoc>(functions, 'createLocatie');
    return from(fn(dto).then(r => r.data));
  }

  updateLocatie(id: string, dto: UpdateLocatieRequest): Observable<LocatieDoc> {
    const fn = httpsCallable<{ id: string } & UpdateLocatieRequest, LocatieDoc>(functions, 'updateLocatie');
    return from(fn({ id, ...dto }).then(r => r.data));
  }

  deleteLocatie(id: string): Observable<{ success: boolean }> {
    const fn = httpsCallable<{ id: string }, { success: boolean }>(functions, 'deleteLocatie');
    return from(fn({ id }).then(r => r.data));
  }

  // ── Activiteiten ─────────────────────────────────────────────────────────

  getActiviteiten(van?: string, tot?: string): Observable<ActiviteitDoc[]> {
    const fn = httpsCallable<{ van?: string; tot?: string }, ActiviteitDoc[]>(functions, 'getActiviteiten');
    return from(fn({ van, tot }).then(r => r.data));
  }

  getAllActiviteiten(): Observable<ActiviteitDoc[]> {
    const fn = httpsCallable<void, ActiviteitDoc[]>(functions, 'getAllActiviteiten');
    return from(fn().then(r => r.data));
  }

  getActiviteit(id: string): Observable<ActiviteitDoc> {
    const fn = httpsCallable<{ id: string }, ActiviteitDoc>(functions, 'getActiviteit');
    return from(fn({ id }).then(r => r.data));
  }

  createActiviteit(dto: CreateActiviteitRequest): Observable<ActiviteitDoc> {
    const fn = httpsCallable<CreateActiviteitRequest, ActiviteitDoc>(functions, 'createActiviteit');
    return from(fn(dto).then(r => r.data));
  }

  updateActiviteit(payload: UpdateActiviteitRequest): Observable<ActiviteitDoc | ActiviteitOccurrenceDoc> {
    const fn = httpsCallable<UpdateActiviteitRequest, ActiviteitDoc | ActiviteitOccurrenceDoc>(functions, 'updateActiviteit');
    return from(fn(payload).then(r => r.data));
  }

  deleteActiviteit(payload: DeleteActiviteitRequest): Observable<{ success: boolean }> {
    const fn = httpsCallable<DeleteActiviteitRequest, { success: boolean }>(functions, 'deleteActiviteit');
    return from(fn(payload).then(r => r.data));
  }

  getOccurrenceOverrides(activiteitId: string): Observable<ActiviteitOccurrenceDoc[]> {
    const fn = httpsCallable<{ activiteitId: string }, ActiviteitOccurrenceDoc[]>(functions, 'getOccurrenceOverrides');
    return from(fn({ activiteitId }).then(r => r.data));
  }

  getAllOccurrenceOverrides(): Observable<ActiviteitOccurrenceDoc[]> {
    const fn = httpsCallable<void, ActiviteitOccurrenceDoc[]>(functions, 'getAllOccurrenceOverrides');
    return from(fn().then(r => r.data));
  }

  // ── Registraties ─────────────────────────────────────────────────────────

  registreer(payload: {
    activiteitId: string;
    occurrenceDatum: string;
    aantalGasten: number;
    opmerking?: string | null;
  }): Observable<ActiviteitRegistratieDoc> {
    const fn = httpsCallable<typeof payload, ActiviteitRegistratieDoc>(functions, 'registreerVoorActiviteit');
    return from(fn(payload).then(r => r.data));
  }

  annuleer(activiteitId: string, occurrenceDatum: string): Observable<{ success: boolean }> {
    const fn = httpsCallable<{ activiteitId: string; occurrenceDatum: string }, { success: boolean }>(functions, 'annuleerRegistratie');
    return from(fn({ activiteitId, occurrenceDatum }).then(r => r.data));
  }

  getRegistraties(activiteitId: string, occurrenceDatum: string): Observable<ActiviteitRegistratieDoc[]> {
    const fn = httpsCallable<{ activiteitId: string; occurrenceDatum: string }, ActiviteitRegistratieDoc[]>(functions, 'getRegistratiesVoorOccurrence');
    return from(fn({ activiteitId, occurrenceDatum }).then(r => r.data));
  }

  getMijnRegistraties(): Observable<ActiviteitRegistratieDoc[]> {
    const fn = httpsCallable<void, ActiviteitRegistratieDoc[]>(functions, 'getMijnRegistraties');
    return from(fn().then(r => r.data));
  }

  updateRegistratieStatus(registratieId: string, status: ActiviteitRegistratieDoc['status']): Observable<ActiviteitRegistratieDoc> {
    const fn = httpsCallable<{ registratieId: string; status: string }, ActiviteitRegistratieDoc>(functions, 'updateRegistratieStatus');
    return from(fn({ registratieId, status }).then(r => r.data));
  }

  // ── Recurrence Engine ─────────────────────────────────────────────────────

  /**
   * Generate all resolved occurrences for a list of activiteiten between van and tot.
   * Only non-cancelled occurrences are returned.
   */
  generateOccurrences(
    activiteiten: ActiviteitDoc[],
    van: Date,
    tot: Date,
    overrides: ActiviteitOccurrenceDoc[],
  ): ResolvedOccurrence[] {
    const result: ResolvedOccurrence[] = [];

    for (const activiteit of activiteiten) {
      const occurrenceDatums = activiteit.isHerhalend && activiteit.recurrenceRule
        ? this.expandRecurrence(activiteit, van, tot)
        : this.singleOccurrence(activiteit, van, tot);

      const overrideMap = new Map<string, ActiviteitOccurrenceDoc>(
        overrides
          .filter(o => o.activiteitId === activiteit.id)
          .map(o => [o.occurrenceDatum, o]),
      );

      for (const datum of occurrenceDatums) {
        const override = overrideMap.get(datum);
        if (override?.status === 'cancelled') continue;
        result.push(this.resolveOccurrence(activiteit, datum, override));
      }
    }

    return result.sort((a, b) => a.startDatumTijd.localeCompare(b.startDatumTijd));
  }

  private singleOccurrence(activiteit: ActiviteitDoc, van: Date, tot: Date): string[] {
    const d = parseISO(activiteit.startDatumTijd);
    if (isAfter(d, tot) || isBefore(d, van)) return [];
    return [format(d, 'yyyy-MM-dd')];
  }

  private expandRecurrence(activiteit: ActiviteitDoc, van: Date, tot: Date): string[] {
    const rule = activiteit.recurrenceRule!;
    const results: string[] = [];
    let current = parseISO(activiteit.startDatumTijd);
    const vanDay = startOfDay(van);
    const totDay = startOfDay(tot);

    // Determine hard end
    const hardEnd = rule.endsOn ? parseISO(rule.endsOn) : null;
    const maxCount = rule.endsAfter ?? 3650; // safety cap

    let count = 0;

    const addIfInRange = (d: Date) => {
      if (hardEnd && !isBefore(d, hardEnd)) return false;
      if (isAfter(startOfDay(d), totDay)) return false;
      count++;
      if (count > maxCount) return false;
      if (!isBefore(startOfDay(d), vanDay)) {
        results.push(format(d, 'yyyy-MM-dd'));
      }
      return true;
    };

    switch (rule.frequency) {
      case 'daily': {
        while (true) {
          if (!addIfInRange(current)) break;
          current = addDays(current, rule.interval);
        }
        break;
      }

      case 'weekly': {
        const days = (rule.daysOfWeek && rule.daysOfWeek.length > 0)
          ? rule.daysOfWeek.slice().sort()
          : [getDay(current)];

        // Find the first week start (Monday of the week containing startDatumTijd)
        let weekStart = current;
        let safetyOuter = 0;
        while (true) {
          safetyOuter++;
          if (safetyOuter > 10000) break;

          let addedThisWeek = false;
          for (const dow of days) {
            // dow 0=Sunday in date-fns, but we use 0=Monday convention matching AGENTS design
            // Map our 0=Ma convention to date-fns: 0=Su,1=Mo,...
            const dfnsDow = dow === 6 ? 0 : dow + 1;
            const candidate = setDay(weekStart, dfnsDow, { weekStartsOn: 1 });

            // Only consider days >= weekStart to avoid going backwards
            const effectiveCandidate = isBefore(candidate, weekStart) ? addWeeks(candidate, 1) : candidate;
            // Preserve time from original startDatumTijd
            const withTime = new Date(effectiveCandidate);
            withTime.setHours(current.getHours(), current.getMinutes(), 0, 0);

            if (isAfter(startOfDay(withTime), totDay)) continue;
            if (hardEnd && !isBefore(startOfDay(withTime), hardEnd)) continue;
            if (isBefore(startOfDay(withTime), startOfDay(current))) continue;

            count++;
            if (count > maxCount) break;
            if (!isBefore(startOfDay(withTime), vanDay)) {
              results.push(format(withTime, 'yyyy-MM-dd'));
            }
            addedThisWeek = true;
          }

          weekStart = addWeeks(weekStart, rule.interval);
          if (isAfter(startOfDay(weekStart), totDay)) break;
          if (!addedThisWeek && isAfter(weekStart, addMonths(parseISO(activiteit.startDatumTijd), 120))) break;
        }
        break;
      }

      case 'monthly-date': {
        while (true) {
          if (!addIfInRange(current)) break;
          current = addMonths(current, rule.interval);
        }
        break;
      }

      case 'monthly-day': {
        // e.g. "2nd Thursday of the month"
        const targetOccurrence = rule.monthlyDayOccurrence ?? 1;
        const targetDow = rule.monthlyDayOfWeek ?? getDay(current);

        while (true) {
          const candidate = this.nthWeekdayOfMonth(current, targetDow, targetOccurrence);
          if (!candidate) {
            current = addMonths(current, rule.interval);
            continue;
          }
          candidate.setHours(current.getHours(), current.getMinutes(), 0, 0);
          if (!addIfInRange(candidate)) break;
          current = addMonths(current, rule.interval);
        }
        break;
      }

      case 'yearly': {
        while (true) {
          if (!addIfInRange(current)) break;
          current = addYears(current, rule.interval);
        }
        break;
      }
    }

    return results;
  }

  /**
   * Find the Nth occurrence of a weekday in the month containing `date`.
   * occurrence=5 means "last". date-fns uses 0=Sunday convention.
   */
  private nthWeekdayOfMonth(date: Date, dowDfns: number, occurrence: number): Date | null {
    const days = eachDayOfInterval({ start: startOfMonth(date), end: endOfMonth(date) });
    const matching = days.filter(d => getDay(d) === dowDfns);
    if (matching.length === 0) return null;
    const idx = occurrence === 5 ? matching.length - 1 : Math.min(occurrence - 1, matching.length - 1);
    return matching[idx];
  }

  private resolveOccurrence(
    activiteit: ActiviteitDoc,
    occurrenceDatum: string,
    override?: ActiviteitOccurrenceDoc,
  ): ResolvedOccurrence {
    const isOverridden = !!override;

    // For recurring activiteiten without an override, replace only the date part
    // while keeping the original start/end times.
    const baseStart = activiteit.isHerhalend && !override
      ? occurrenceDatum + activiteit.startDatumTijd.substring(10)
      : activiteit.startDatumTijd;
    const durationMs = new Date(activiteit.eindDatumTijd).getTime() - new Date(activiteit.startDatumTijd).getTime();
    const baseEnd = activiteit.isHerhalend && !override
      ? new Date(new Date(baseStart).getTime() + durationMs).toISOString().substring(0, 16)
      : activiteit.eindDatumTijd;

    return {
      activiteitId: activiteit.id,
      occurrenceDatum,
      isOverridden,
      titel: override?.titel ?? activiteit.titel,
      beschrijving: override?.beschrijving !== undefined ? override.beschrijving : activiteit.beschrijving,
      startDatumTijd: override?.startDatumTijd ?? baseStart,
      eindDatumTijd: override?.eindDatumTijd ?? baseEnd,
      locatieId: override?.locatieId !== undefined ? override.locatieId : activiteit.locatieId,
      locatieNaam: override?.locatieNaam !== undefined ? override.locatieNaam : activiteit.locatieNaam,
      locatieVrij: activiteit.locatieVrij,
      bannerUrl: override?.bannerUrl !== undefined ? override.bannerUrl : activiteit.bannerUrl,
      maxDeelnemers: override?.maxDeelnemers !== undefined ? override.maxDeelnemers : activiteit.maxDeelnemers,
      inschrijvingenActief: activiteit.inschrijvingenActief,
      registratiesZichtbaar: activiteit.registratiesZichtbaar,
      gasten: activiteit.gasten,
      maxGastenPerInschrijving: activiteit.maxGastenPerInschrijving,
      gastKosten: activiteit.gastKosten,
      lidKosten: activiteit.lidKosten,
      organisatorId: activiteit.organisatorId,
      organisatorNaam: activiteit.organisatorNaam,
      organisatorLeden: activiteit.organisatorLeden,
      organisatorGroepId: activiteit.organisatorGroepId,
      threadId: activiteit.threadId,
      groepId: activiteit.groepId,
      isPubliek: activiteit.isPubliek,
    };
  }
}
