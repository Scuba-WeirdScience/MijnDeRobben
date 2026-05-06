import { onRequest } from 'firebase-functions/v2/https';
import { db, REGION } from '../shared/admin';
import { ActiviteitDoc } from '../shared/types';

const CALENDAR_NAME = 'Duikclub De Robben — Activiteiten';
const CALENDAR_DESCRIPTION = 'Publieke activiteiten van Duikclub De Robben'; // v2
const PRODUCT_ID = '-//Duikclub De Robben//Activiteiten//NL';

/** Escape special characters for ICS text fields */
function icsEscape(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '');
}

/** Strip HTML tags for plain-text description */
function stripHtml(html: string | null): string {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').trim();
}

/** Format a local datetime string (YYYY-MM-DDTHH:mm) to ICS DTSTART/DTEND format */
function toIcsDateTime(localDt: string): string {
  // localDt = "2026-05-10T14:00" or full ISO
  const clean = localDt.substring(0, 16).replace(/[-:T]/g, '');
  // Pad to 15 chars: YYYYMMDDTHHMMSS
  return clean.substring(0, 8) + 'T' + clean.substring(8) + '00';
}

/** Fold long ICS lines at 75 characters */
function foldLine(line: string): string {
  if (line.length <= 75) return line;
  const chunks: string[] = [];
  chunks.push(line.substring(0, 75));
  let i = 75;
  while (i < line.length) {
    chunks.push(' ' + line.substring(i, i + 74));
    i += 74;
  }
  return chunks.join('\r\n');
}

/** Generate a stable UID for an activiteit occurrence */
function makeUid(activiteitId: string, datum?: string): string {
  const suffix = datum ? `_${datum.replace(/[-:T]/g, '')}` : '';
  return `${activiteitId}${suffix}@dcderobben`;
}

/** Generate ICS VEVENT lines for a single activiteit (non-recurring) */
function makeVEvent(doc: ActiviteitDoc, datum?: string): string {
  const start = datum
    ? toIcsDateTime(datum + 'T' + doc.startDatumTijd.split('T')[1])
    : toIcsDateTime(doc.startDatumTijd);
  const end = datum
    ? toIcsDateTime(datum + 'T' + doc.eindDatumTijd.split('T')[1])
    : toIcsDateTime(doc.eindDatumTijd);

  const locatie = doc.locatieVrij ?? doc.locatieNaam ?? '';
  const beschrijving = stripHtml(doc.beschrijving);
  const uid = makeUid(doc.id, datum);
  const dtstamp = new Date().toISOString().replace(/[-:.]/g, '').substring(0, 15) + 'Z';

  const lines = [
    'BEGIN:VEVENT',
    foldLine(`UID:${uid}`),
    `DTSTAMP:${dtstamp}`,
    `DTSTART;TZID=Europe/Brussels:${start}`,
    `DTEND;TZID=Europe/Brussels:${end}`,
    foldLine(`SUMMARY:${icsEscape(doc.titel)}`),
  ];

  if (beschrijving) {
    lines.push(foldLine(`DESCRIPTION:${icsEscape(beschrijving)}`));
  }
  if (locatie) {
    lines.push(foldLine(`LOCATION:${icsEscape(locatie)}`));
  }
  if (doc.updatedAt ?? doc.createdAt) {
    const lastMod = (doc.updatedAt ?? doc.createdAt).replace(/[-:.]/g, '').substring(0, 15) + 'Z';
    lines.push(`LAST-MODIFIED:${lastMod}`);
  }

  lines.push('END:VEVENT');
  return lines.join('\r\n');
}

/** Expand a recurring activiteit into occurrences within the next 12 months */
function expandOccurrences(doc: ActiviteitDoc): string[] {
  if (!doc.isHerhalend || !doc.recurrenceRule) return [];

  const rule = doc.recurrenceRule;
  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setFullYear(cutoff.getFullYear() + 1);

  const startBase = new Date(doc.startDatumTijd);
  const dates: string[] = [];

  // Simple expansion: walk forward from startDatumTijd up to 1 year
  let current = new Date(startBase);

  // Skip dates in the past
  while (current < now) {
    current = advance(current, rule);
  }

  let safety = 0;
  while (current <= cutoff && safety < 200) {
    safety++;
    const dateStr = current.toISOString().substring(0, 10);
    // Respect endsOn if set
    if (rule.endsOn && dateStr > rule.endsOn) break;
    dates.push(dateStr);
    current = advance(current, rule);
  }

  return dates;
}

function advance(date: Date, rule: { frequency: string; interval?: number }): Date {
  const interval = rule.interval ?? 1;
  const next = new Date(date);
  switch (rule.frequency) {
    case 'daily':
      next.setDate(next.getDate() + interval);
      break;
    case 'weekly':
      next.setDate(next.getDate() + 7 * interval);
      break;
    case 'monthly':
      next.setMonth(next.getMonth() + interval);
      break;
    case 'yearly':
      next.setFullYear(next.getFullYear() + interval);
      break;
    default:
      next.setDate(next.getDate() + 7);
  }
  return next;
}

export const activiteitenIcs = onRequest(
  { region: REGION, cors: true },
  async (req, res) => {
    try {
      // Fetch all public activiteiten
      const snap = await db.collection('activiteiten')
        .where('isPubliek', '==', true)
        .get();

      const docs = snap.docs.map(d => d.data() as ActiviteitDoc);

      const vevents: string[] = [];
      const now = new Date();
      const cutoff = new Date(now);
      cutoff.setFullYear(cutoff.getFullYear() + 1);
      const pastCutoff = new Date(now);
      pastCutoff.setMonth(pastCutoff.getMonth() - 3); // include 3 months back

      for (const doc of docs) {
        if (doc.isHerhalend && doc.recurrenceRule) {
          const occurrences = expandOccurrences(doc);
          for (const datum of occurrences) {
            vevents.push(makeVEvent(doc, datum));
          }
        } else {
          // Single event — include if within range
          const start = new Date(doc.startDatumTijd);
          if (start >= pastCutoff && start <= cutoff) {
            vevents.push(makeVEvent(doc));
          }
        }
      }

      const ics = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        `PRODID:${PRODUCT_ID}`,
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        `X-WR-CALNAME:${CALENDAR_NAME}`,
        `X-WR-CALDESC:${CALENDAR_DESCRIPTION}`,
        'X-WR-TIMEZONE:Europe/Brussels',
        'BEGIN:VTIMEZONE',
        'TZID:Europe/Brussels',
        'BEGIN:STANDARD',
        'DTSTART:19701025T030000',
        'RRULE:FREQ=YEARLY;BYDAY=-1SU;BYMONTH=10',
        'TZOFFSETFROM:+0200',
        'TZOFFSETTO:+0100',
        'TZNAME:CET',
        'END:STANDARD',
        'BEGIN:DAYLIGHT',
        'DTSTART:19700329T020000',
        'RRULE:FREQ=YEARLY;BYDAY=-1SU;BYMONTH=3',
        'TZOFFSETFROM:+0100',
        'TZOFFSETTO:+0200',
        'TZNAME:CEST',
        'END:DAYLIGHT',
        'END:VTIMEZONE',
        ...vevents,
        'END:VCALENDAR',
      ].join('\r\n');

      res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.status(200).send(ics);
    } catch (err) {
      console.error('activiteitenIcs error', err);
      res.status(500).send('Internal Server Error');
    }
  }
);
