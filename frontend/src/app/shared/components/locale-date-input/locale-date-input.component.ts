import {
  Component,
  input,
  output,
  signal,
  effect,
} from '@angular/core';
import { format, parse, isValid, parseISO } from 'date-fns';

// ---------------------------------------------------------------------------
// Regional format detection — uses the OS/browser REGIONAL setting,
// not the UI language.  Works correctly for e.g. an English-language browser
// on a Dutch-regional Windows machine.
// ---------------------------------------------------------------------------

/**
 * Build a date-fns format string (e.g. "dd-MM-yyyy") by inspecting
 * `Intl.DateTimeFormat` with no explicit locale — which resolves to the
 * runtime's default regional locale (OS Region setting on Windows/macOS,
 * `LANG`/`LC_TIME` on Linux).
 *
 * We use Jan 15 2000 as the probe date: day=15, month=01, year=2000 are
 * each unambiguously identifiable in the formatted parts.
 */
function detectRegionalFormatString(): string {
  try {
    const parts = new Intl.DateTimeFormat(undefined, {
      year:  'numeric',
      month: '2-digit',
      day:   '2-digit',
    }).formatToParts(new Date(2000, 0, 15)); // 15 Jan 2000

    const tokenMap: Record<string, string> = {
      day:   'dd',
      month: 'MM',
      year:  'yyyy',
    };

    return parts
      .map(p => tokenMap[p.type] ?? (p.type === 'literal' ? p.value : ''))
      .join('');
  } catch {
    // SSR / very old browser safety net
    return 'dd-MM-yyyy';
  }
}

/**
 * Build a human-readable placeholder from the format string.
 * "dd-MM-yyyy" → "dd-mm-yyyy"  |  "MM/dd/yyyy" → "mm/dd/yyyy"
 */
function formatToPlaceholder(fmtStr: string): string {
  return fmtStr.replace(/MM/g, 'mm'); // only MM → mm; dd and yyyy stay as-is
}

// Compute once at module load — format string is the same for the entire session.
const REGIONAL_FORMAT = detectRegionalFormatString();
const PLACEHOLDER     = formatToPlaceholder(REGIONAL_FORMAT);

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * A locale-aware date text input.
 *
 * - Accepts and emits ISO 8601 date strings (`yyyy-MM-dd` or empty string).
 * - Displays and accepts input in the OS regional date format, detected
 *   automatically via `Intl.DateTimeFormat` — independent of the browser
 *   UI language.
 * - Wraps cleanly into the signal-form pattern via `[value]` / `(valueChange)`.
 *
 * Usage:
 * ```html
 * <app-locale-date-input
 *   [value]="form.fields.dateOfBirth.value()"
 *   [invalid]="form.fields.dateOfBirth.invalid()"
 *   (valueChange)="setText('dateOfBirth', $event)"
 *   (blur)="form.fields.dateOfBirth.touched.set(true)"
 * />
 * ```
 */
@Component({
  selector: 'app-locale-date-input',
  standalone: true,
  imports: [],
  templateUrl: './locale-date-input.component.html',
})
export class LocaleDateInputComponent {
  /** ISO date string (`yyyy-MM-dd`) or empty string coming from the form signal. */
  readonly value = input<string>('');

  /** Whether the field is in an invalid state (drives red border). */
  readonly invalid = input<boolean>(false);

  /** Emits an ISO date string (`yyyy-MM-dd`) or `''` when the user leaves the field. */
  readonly valueChange = output<string>();

  /** Emits when the input loses focus (so parent can mark the field as touched). */
  // eslint-disable-next-line @angular-eslint/no-output-native
  readonly blur = output<void>();

  readonly placeholder  = PLACEHOLDER;
  readonly displayValue = signal('');

  /** True while the user has the field focused — prevents re-formatting mid-type. */
  private typing = false;

  constructor() {
    // Sync display value from input signal when not typing
    effect(() => {
      if (!this.typing) {
        this.displayValue.set(this.isoToDisplay(this.value()));
      }
    }, { allowSignalWrites: true });
  }

  onFocus(): void {
    this.typing = true;
  }

  onInput(raw: string): void {
    this.displayValue.set(raw);
  }

  onBlur(raw: string): void {
    this.typing = false;
    const iso = this.displayToIso(raw.trim());
    this.valueChange.emit(iso);
    // Re-format on blur: show the canonical locale representation of the date.
    this.displayValue.set(iso ? this.isoToDisplay(iso) : raw.trim());
    this.blur.emit();
  }

  // -------------------------------------------------------------------------
  // Conversion helpers
  // -------------------------------------------------------------------------

  /** Format an ISO `yyyy-MM-dd` string for display in the regional format. */
  private isoToDisplay(iso: string): string {
    if (!iso) return '';
    const d = parseISO(iso);
    if (!isValid(d)) return iso;
    return format(d, REGIONAL_FORMAT);
  }

  /**
   * Parse a regionally-formatted date string to ISO `yyyy-MM-dd`.
   * Returns `''` if the input is empty or cannot be parsed.
   *
   * Accepts:
   *   - Regional format  (e.g. "22-06-1978" for nl-NL)
   *   - ISO format       (e.g. "1985-03-15") — always accepted as fallback
   */
  private displayToIso(display: string): string {
    if (!display) return '';

    // Primary: parse using the detected regional format string.
    // date-fns parse() handles purely-numeric formats without needing a locale.
    const parsed = parse(display, REGIONAL_FORMAT, new Date());
    if (isValid(parsed)) {
      return format(parsed, 'yyyy-MM-dd');
    }

    // Fallback: accept ISO input directly (power users / copy-paste).
    const iso = parseISO(display);
    if (isValid(iso)) {
      return format(iso, 'yyyy-MM-dd');
    }

    // Unparseable → emit '' so Zod validation shows an error.
    return '';
  }
}
