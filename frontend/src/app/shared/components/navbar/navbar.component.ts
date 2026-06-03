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
  'ring-1', 'ring-scuba-200', 'dark:ring-scuba-700',
  'ring-offset-2', 'ring-offset-white', 'dark:ring-offset-gray-900',
  'hover:bg-gray-100', 'dark:hover:bg-gray-800',
];

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, ...LUCIDE_ICONS],
  templateUrl: './navbar.component.html',
  host: { class: 'flex-shrink-0' },
})
export class NavbarComponent {
  mobileOpen = false;
  readonly userMenuOpen = signal(false);
  readonly adminMenuOpen = signal(false);
  readonly appearanceMenuOpen = signal(false);

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

  toggleAppearanceMenu(): void {
    this.appearanceMenuOpen.update(v => !v);
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
    this.appearanceMenuOpen.set(false);
  }

  selectScheme(s: ColorScheme): void {
    this.theme.setColorScheme(s);
    this.appearanceMenuOpen.set(false);
  }

  openChangelog(): void {
    this.closeUserMenu();
    this.pwa.openChangelog();
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
    if (!target.closest('[data-appearance-menu]')) {
      this.appearanceMenuOpen.set(false);
    }
  }
}
