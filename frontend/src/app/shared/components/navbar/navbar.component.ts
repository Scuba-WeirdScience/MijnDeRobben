import { Component, inject, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { ThemeService, ThemeOption, ColorScheme, COLOR_SCHEMES } from '../../../core/services/theme.service';
import { AvatarStateService } from '../../../core/services/avatar-state.service';
import { PwaService } from '../../../core/services/pwa.service';
import { UnreadCountService } from '../../../core/services/unread-count.service';
import { VerzorgerContextService } from '../../../core/services/verzorger-context.service';
import { LUCIDE_ICONS } from '../../lucide-icons';

// Tailwind safelist — do not remove
const _TW_SAFELIST = [
  'bg-scuba-50', 'dark:bg-scuba-900/20',
  'text-scuba-700', 'dark:text-scuba-300',
  'ring-2', 'ring-scuba-500', 'ring-white',
];

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, ...LUCIDE_ICONS],
  templateUrl: './navbar.component.html',
})
export class NavbarComponent {
  mobileOpen = false;
  readonly userMenuOpen = signal(false);
  readonly adminMenuOpen = signal(false);
  readonly themeMenuOpen = signal(false);
  readonly schemeMenuOpen = signal(false);

  readonly auth = inject(AuthService);
  readonly theme = inject(ThemeService);
  readonly router = inject(Router);
  readonly avatarState = inject(AvatarStateService);
  readonly pwa = inject(PwaService);
  readonly berichten = inject(UnreadCountService);
  readonly verzorgerCtx = inject(VerzorgerContextService);

  readonly themeOptions: { value: ThemeOption; label: string; icon: string }[] = [
    { value: 'light',  label: 'Licht',  icon: '☀️' },
    { value: 'dark',   label: 'Donker', icon: '🌙' },
    { value: 'system', label: 'Systeem', icon: '💻' },
  ];

  readonly colorSchemes = COLOR_SCHEMES;

  userInitial(): string {
    const email = this.auth.currentUser()?.email ?? '';
    return email[0]?.toUpperCase() ?? '?';
  }

  toggleUserMenu(): void {
    this.userMenuOpen.update(v => !v);
  }

  toggleAdminMenu(): void {
    this.adminMenuOpen.update(v => !v);
  }

  toggleThemeMenu(): void {
    this.themeMenuOpen.update(v => !v);
    this.schemeMenuOpen.set(false);
  }

  toggleSchemeMenu(): void {
    this.schemeMenuOpen.update(v => !v);
    this.themeMenuOpen.set(false);
  }

  closeUserMenu(): void {
    this.userMenuOpen.set(false);
    this.mobileOpen = false;
  }

  closeAdminMenu(): void {
    this.adminMenuOpen.set(false);
    this.mobileOpen = false;
  }

  logout(): void {
    this.closeUserMenu();
    this.auth.logout();
  }

  selectTheme(t: ThemeOption): void {
    this.theme.setTheme(t);
    this.themeMenuOpen.set(false);
  }

  selectScheme(s: ColorScheme): void {
    this.theme.setColorScheme(s);
    this.schemeMenuOpen.set(false);
  }

  currentThemeIcon(): string {
    return this.themeOptions.find(o => o.value === this.theme.theme())?.icon ?? '💻';
  }

  /** Close dropdowns when clicking outside */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('[data-user-menu]')) {
      this.userMenuOpen.set(false);
    }
    if (!target.closest('[data-admin-menu]')) {
      this.adminMenuOpen.set(false);
    }
    if (!target.closest('[data-theme-menu]')) {
      this.themeMenuOpen.set(false);
    }
    if (!target.closest('[data-scheme-menu]')) {
      this.schemeMenuOpen.set(false);
    }
  }
}
