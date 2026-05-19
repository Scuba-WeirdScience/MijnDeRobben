import { TestBed } from '@angular/core/testing';
import { ThemeService, ThemeOption, ColorScheme, COLOR_SCHEMES } from './theme.service';

describe('ThemeService', () => {
  let service: ThemeService;

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('class');
    document.documentElement.removeAttribute('data-scheme');

    TestBed.configureTestingModule({ providers: [ThemeService] });
    service = TestBed.inject(ThemeService);
  });

  it('defaults to "system" theme when nothing is stored', () => {
    expect(service.theme()).toBe('system');
  });

  it('defaults to "ocean" color scheme when nothing is stored', () => {
    expect(service.colorScheme()).toBe('ocean');
  });

  it('reads persisted theme from localStorage', () => {
    localStorage.setItem('theme', 'dark');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [ThemeService] });
    const s = TestBed.inject(ThemeService);
    expect(s.theme()).toBe('dark');
  });

  it('reads persisted color scheme from localStorage', () => {
    localStorage.setItem('colorScheme', 'forest');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [ThemeService] });
    const s = TestBed.inject(ThemeService);
    expect(s.colorScheme()).toBe('forest');
  });

  it('setTheme() updates the theme signal', () => {
    service.setTheme('light');
    expect(service.theme()).toBe('light');
  });

  it('setColorScheme() updates the colorScheme signal', () => {
    service.setColorScheme('sunset');
    expect(service.colorScheme()).toBe('sunset');
  });

  it('isDark is false when "light" theme is persisted at construction', () => {
    localStorage.setItem('theme', 'light');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [ThemeService] });
    const s = TestBed.inject(ThemeService);
    expect(s.isDark()).toBe(false);
  });

  it('isDark is true when "dark" theme is persisted at construction', () => {
    localStorage.setItem('theme', 'dark');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [ThemeService] });
    const s = TestBed.inject(ThemeService);
    expect(s.isDark()).toBe(true);
  });

  it('schemeAccentColor() returns the accent for the active scheme', () => {
    service.setColorScheme('forest');
    const expected = COLOR_SCHEMES.find(s => s.value === 'forest')!.accent;
    expect(service.schemeAccentColor()).toBe(expected);
  });

  it('COLOR_SCHEMES contains all 5 expected schemes', () => {
    const values = COLOR_SCHEMES.map(s => s.value) as ColorScheme[];
    expect(values).toContain('ocean');
    expect(values).toContain('forest');
    expect(values).toContain('sunset');
    expect(values).toContain('slate');
    expect(values).toContain('rose');
  });

  it('falls back to default scheme for unknown localStorage value', () => {
    localStorage.setItem('colorScheme', 'unknown-scheme');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [ThemeService] });
    const s = TestBed.inject(ThemeService);
    expect(s.colorScheme()).toBe('ocean');
  });

  it('falls back to system theme for unknown localStorage value', () => {
    localStorage.setItem('theme', 'invalid' as ThemeOption);
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [ThemeService] });
    const s = TestBed.inject(ThemeService);
    expect(s.theme()).toBe('system');
  });
});
