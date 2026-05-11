/**
 * Pure recurrence expansion engine — no Angular, no Firebase, no side effects.
 *
 * Extracts the domain logic that was previously a private method on ActiviteitenService.
 * Test this module directly with `node --test` or any plain test runner.
 */
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
import {
  ActiviteitDoc,
  ActiviteitOccurrenceDoc,
  ResolvedOccurrence,
} from './activiteiten.service';

/**
 * Generate all resolved occurrences for a list of activiteiten between van and tot.
 * Cancelled occurrences are excluded. Result is sorted by startDatumTijd ascending.
 */
export function generateOccurrences(
  activiteiten: ActiviteitDoc[],
  van: Date,
  tot: Date,
  overrides: ActiviteitOccurrenceDoc[],
): ResolvedOccurrence[] {
  const result: ResolvedOccurrence[] = [];

  for (const activiteit of activiteiten) {
    const occurrenceDatums = activiteit.isHerhalend && activiteit.recurrenceRule
      ? expandRecurrence(activiteit, van, tot)
      : singleOccurrence(activiteit, van, tot);

    const overrideMap = new Map<string, ActiviteitOccurrenceDoc>(
      overrides
        .filter(o => o.activiteitId === activiteit.id)
        .map(o => [o.occurrenceDatum, o]),
    );

    for (const datum of occurrenceDatums) {
      const override = overrideMap.get(datum);
      if (override?.status === 'cancelled') continue;
      result.push(resolveOccurrence(activiteit, datum, override));
    }
  }

  return result.sort((a, b) => a.startDatumTijd.localeCompare(b.startDatumTijd));
}

function singleOccurrence(activiteit: ActiviteitDoc, van: Date, tot: Date): string[] {
  const d = parseISO(activiteit.startDatumTijd);
  if (isAfter(d, tot) || isBefore(d, van)) return [];
  return [format(d, 'yyyy-MM-dd')];
}

function expandRecurrence(activiteit: ActiviteitDoc, van: Date, tot: Date): string[] {
  const rule = activiteit.recurrenceRule!;
  const results: string[] = [];
  let current = parseISO(activiteit.startDatumTijd);
  const vanDay = startOfDay(van);
  const totDay = startOfDay(tot);

  const hardEnd = rule.endsOn ? parseISO(rule.endsOn) : null;
  const maxCount = rule.endsAfter ?? 3650; // safety cap

  let count = 0;

  const addIfInRange = (d: Date): boolean => {
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

      let weekStart = current;
      let safetyOuter = 0;
      while (true) {
        safetyOuter++;
        if (safetyOuter > 10000) break;

        let addedThisWeek = false;
        for (const dow of days) {
          // Map our 0=Ma convention to date-fns 0=Sunday convention
          const dfnsDow = dow === 6 ? 0 : dow + 1;
          const candidate = setDay(weekStart, dfnsDow, { weekStartsOn: 1 });

          const effectiveCandidate = isBefore(candidate, weekStart) ? addWeeks(candidate, 1) : candidate;
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
      const targetOccurrence = rule.monthlyDayOccurrence ?? 1;
      const targetDow = rule.monthlyDayOfWeek ?? getDay(current);

      while (true) {
        const candidate = nthWeekdayOfMonth(current, targetDow, targetOccurrence);
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
 * occurrence=5 means "last". Uses date-fns 0=Sunday convention.
 */
function nthWeekdayOfMonth(date: Date, dowDfns: number, occurrence: number): Date | null {
  const days = eachDayOfInterval({ start: startOfMonth(date), end: endOfMonth(date) });
  const matching = days.filter(d => getDay(d) === dowDfns);
  if (matching.length === 0) return null;
  const idx = occurrence === 5 ? matching.length - 1 : Math.min(occurrence - 1, matching.length - 1);
  return matching[idx];
}

function resolveOccurrence(
  activiteit: ActiviteitDoc,
  occurrenceDatum: string,
  override?: ActiviteitOccurrenceDoc,
): ResolvedOccurrence {
  const isOverridden = !!override;

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
