import { Injectable, signal, effect, inject } from '@angular/core';
import { call } from '../firebase/callable';

export type ThemeOption = 'light' | 'dark' | 'system';

interface UserSettings {
  theme?: ThemeOption;
}

const LS_KEY = 'theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  /** The user's explicit choice: light | dark | system */
  readonly theme = signal<ThemeOption>(this._loadInitial());

  /** Resolved dark flag — true when the effective theme is dark */
  readonly isDark = signal<boolean>(this._resolve(this._loadInitial()));

  private get _mediaQuery(): MediaQueryList {
    return window.matchMedia('(prefers-color-scheme: dark)');
  }

  constructor() {
    // Apply theme to DOM and persist to localStorage whenever it changes.
    effect(() => {
      const t = this.theme();
      localStorage.setItem(LS_KEY, t);
      this.isDark.set(this._resolve(t));
      document.documentElement.classList.toggle('dark', this.isDark());
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
    this._saveToFirestore(t);
  }

  /** Called after login — loads the persisted setting from Firestore. */
  async loadFromFirestore(): Promise<void> {
    try {
      const result = await call<void, UserSettings>('getUserSettings');
      const remote = result?.theme;
      if (remote && remote !== this.theme()) {
        this.theme.set(remote);
      }
    } catch {
      // Not logged in or network error — stay with local value.
    }
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private _loadInitial(): ThemeOption {
    if (typeof window === 'undefined') return 'system';
    const saved = localStorage.getItem(LS_KEY) as ThemeOption | null;
    return saved && ['light', 'dark', 'system'].includes(saved) ? saved : 'system';
  }

  private _resolve(t: ThemeOption): boolean {
    if (t === 'light') return false;
    if (t === 'dark')  return true;
    return typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)').matches : false;
  }

  private _saveToFirestore(t: ThemeOption): void {
    call<UserSettings, UserSettings>('saveUserSettings', { theme: t }).catch(() => { /* silently ignore */ });
  }
}
