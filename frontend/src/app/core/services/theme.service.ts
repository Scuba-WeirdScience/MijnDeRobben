import { Injectable, signal, effect, computed } from '@angular/core';
import { call } from '../firebase/callable';

export type ThemeOption = 'light' | 'dark' | 'system';
export type ColorScheme = 'ocean' | 'forest' | 'sunset' | 'slate' | 'rose';

export const COLOR_SCHEMES: { value: ColorScheme; label: string; accent: string }[] = [
  { value: 'ocean',  label: 'Oceaan',        accent: '#0077b6' },
  { value: 'forest', label: 'Woud',          accent: '#059669' },
  { value: 'sunset', label: 'Zonsondergang', accent: '#ea580c' },
  { value: 'slate',  label: 'Lei',           accent: '#475569' },
  { value: 'rose',   label: 'Roos',          accent: '#e11d48' },
];

interface UserSettings {
  theme?: ThemeOption;
  colorScheme?: ColorScheme;
}

const LS_KEY_THEME = 'theme';
const LS_KEY_SCHEME = 'colorScheme';
const DEFAULT_SCHEME: ColorScheme = 'ocean';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  /** The user's explicit light/dark/system choice */
  readonly theme = signal<ThemeOption>(this._loadInitialTheme());

  /** Resolved dark flag */
  readonly isDark = signal<boolean>(this._resolve(this._loadInitialTheme()));

  /** The chosen colour scheme */
  readonly colorScheme = signal<ColorScheme>(this._loadInitialScheme());

  /** The accent hex for the current scheme — used for the swatch button in the navbar */
  readonly schemeAccentColor = computed(() =>
    COLOR_SCHEMES.find(s => s.value === this.colorScheme())?.accent ?? '#0077b6'
  );

  private get _mediaQuery(): MediaQueryList {
    return window.matchMedia('(prefers-color-scheme: dark)');
  }

  constructor() {
    // Apply light/dark and colour scheme to DOM whenever either changes.
    effect(() => {
      const t = this.theme();
      localStorage.setItem(LS_KEY_THEME, t);
      this.isDark.set(this._resolve(t));
      document.documentElement.classList.toggle('dark', this.isDark());
    });

    effect(() => {
      const s = this.colorScheme();
      localStorage.setItem(LS_KEY_SCHEME, s);
      document.documentElement.setAttribute('data-scheme', s);
    });

    // Listen for OS-level dark mode changes (relevant when theme === 'system').
    this._mediaQuery.addEventListener('change', () => {
      if (this.theme() === 'system') {
        this.isDark.set(this._mediaQuery.matches);
        document.documentElement.classList.toggle('dark', this._mediaQuery.matches);
      }
    });
  }

  setTheme(t: ThemeOption): void {
    this.theme.set(t);
    this._saveToFirestore({ theme: t });
  }

  setColorScheme(s: ColorScheme): void {
    this.colorScheme.set(s);
    this._saveToFirestore({ colorScheme: s });
  }

  /** Called after login — loads the persisted settings from Firestore. */
  async loadFromFirestore(): Promise<void> {
    try {
      const result = await call<void, UserSettings>('getUserSettings');
      if (result?.theme && result.theme !== this.theme()) {
        this.theme.set(result.theme);
      }
      if (result?.colorScheme && result.colorScheme !== this.colorScheme()) {
        this.colorScheme.set(result.colorScheme);
      }
    } catch {
      // Not logged in or network error — stay with local value.
    }
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private _loadInitialTheme(): ThemeOption {
    if (typeof window === 'undefined') return 'system';
    const saved = localStorage.getItem(LS_KEY_THEME) as ThemeOption | null;
    return saved && ['light', 'dark', 'system'].includes(saved) ? saved : 'system';
  }

  private _loadInitialScheme(): ColorScheme {
    if (typeof window === 'undefined') return DEFAULT_SCHEME;
    const saved = localStorage.getItem(LS_KEY_SCHEME) as ColorScheme | null;
    const valid: ColorScheme[] = COLOR_SCHEMES.map(s => s.value);
    return saved && valid.includes(saved) ? saved : DEFAULT_SCHEME;
  }

  private _resolve(t: ThemeOption): boolean {
    if (t === 'light') return false;
    if (t === 'dark')  return true;
    return typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)').matches : false;
  }

  private _saveToFirestore(patch: Partial<UserSettings>): void {
    call<Partial<UserSettings>, UserSettings>('saveUserSettings', patch).catch(() => { /* silently ignore */ });
  }
}
