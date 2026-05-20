import { Pipe, PipeTransform } from '@angular/core';
import { format, parseISO, isValid, parse } from 'date-fns';

/**
 * Detects the OS/browser regional date format using Intl.DateTimeFormat.
 * Returns a date-fns format string like "dd/MM/yyyy" or "MM/dd/yyyy".
 */
function detectRegionalFormatString(): string {
  try {
    const parts = new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date(2000, 0, 15)); // 15 Jan 2000

    const tokenMap: Record<string, string> = {
      day: 'dd',
      month: 'MM',
      year: 'yyyy',
    };

    return parts
      .map(p => tokenMap[p.type] ?? (p.type === 'literal' ? p.value : ''))
      .join('');
  } catch {
    return 'dd/MM/yyyy';
  }
}

const REGIONAL_FORMAT = detectRegionalFormatString();

/**
 * Formats a `yyyy-MM-dd` ISO date string to the user's regional date format.
 *
 * Usage in template:
 * ```html
 * {{ member.dateOfBirth | localeDate }}
 * {{ member.dateOfBirth | localeDate:'long' }}
 * ```
 *
 * Formats:
 * - (default / 'short'): regional format, e.g. "15/01/2000" (NL-BE)
 * - 'long': "15 januari 2000" using Intl.DateTimeFormat with nl-BE locale
 *
 * Returns '-' for null/undefined/empty input.
 */
@Pipe({ name: 'localeDate', standalone: true, pure: true })
export class LocaleDatePipe implements PipeTransform {
  transform(value: string | null | undefined, style: 'short' | 'long' = 'short'): string {
    if (!value) return '-';

    // Accept both yyyy-MM-dd and ISO datetime strings (take date part only)
    const datePart = value.length > 10 ? value.substring(0, 10) : value;

    let date: Date;
    try {
      date = parse(datePart, 'yyyy-MM-dd', new Date());
      if (!isValid(date)) {
        date = parseISO(value);
      }
      if (!isValid(date)) return value;
    } catch {
      return value;
    }

    if (style === 'long') {
      return new Intl.DateTimeFormat('nl-BE', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(date);
    }

    return format(date, REGIONAL_FORMAT);
  }
}
