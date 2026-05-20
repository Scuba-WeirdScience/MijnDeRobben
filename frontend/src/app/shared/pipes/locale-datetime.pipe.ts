import { Pipe, PipeTransform } from '@angular/core';
import { parseISO, isValid } from 'date-fns';

/**
 * Formats an ISO datetime string (e.g. "2026-06-15T10:00") to a localized
 * date+time display using nl-BE conventions.
 *
 * Usage in template:
 * ```html
 * {{ occurrence.startDatumTijd | localeDateTime }}
 * {{ occurrence.startDatumTijd | localeDateTime:'date-only' }}
 * {{ occurrence.startDatumTijd | localeDateTime:'long' }}
 * ```
 *
 * Formats:
 * - (default / 'short'): "ma 15 jun, 10:00"
 * - 'date-only': "15/06/2026" (regional format)
 * - 'long': "maandag 15 juni 2026 om 10:00"
 *
 * Returns '-' for null/undefined/empty input.
 */
@Pipe({ name: 'localeDateTime', standalone: true, pure: true })
export class LocaleDateTimePipe implements PipeTransform {
  transform(value: string | null | undefined, style: 'short' | 'long' | 'date-only' = 'short'): string {
    if (!value) return '-';

    let date: Date;
    try {
      date = parseISO(value);
      if (!isValid(date)) return value;
    } catch {
      return value;
    }

    if (style === 'date-only') {
      return new Intl.DateTimeFormat('nl-BE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(date);
    }

    if (style === 'long') {
      const datePart = new Intl.DateTimeFormat('nl-BE', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(date);
      const timePart = new Intl.DateTimeFormat('nl-BE', {
        hour: '2-digit',
        minute: '2-digit',
      }).format(date);
      return `${datePart} om ${timePart}`;
    }

    // 'short': "ma 15 jun, 10:00"
    const datePart = new Intl.DateTimeFormat('nl-BE', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    }).format(date);
    const timePart = new Intl.DateTimeFormat('nl-BE', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
    return `${datePart}, ${timePart}`;
  }
}
