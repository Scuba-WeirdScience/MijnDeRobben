import { Component, inject, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { AdminRoleService } from '../services/admin-role.service';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { SpinnerComponent } from '../../../shared/components/spinner/spinner.component';
import {
  UserDetailPanelComponent,
  UserSummary,
} from './user-detail-panel/user-detail-panel.component';
import { ALL_ROLES, Role } from '../../../core/models/role.model';

// Tailwind safelist — classes built via roleBadgeClass() are invisible to the scanner
const _TW_SAFELIST = [
  'bg-red-100', 'text-red-700', 'dark:bg-red-900/30', 'dark:text-red-300',
  'bg-purple-100', 'text-purple-700', 'dark:bg-purple-900/30', 'dark:text-purple-300',
  'bg-amber-100', 'text-amber-700', 'dark:bg-amber-900/30', 'dark:text-amber-300',
  'bg-green-100', 'text-green-700', 'dark:bg-green-900/30', 'dark:text-green-300',
  'bg-scuba-100', 'text-scuba-700', 'dark:bg-scuba-900/30', 'dark:text-scuba-300',
];

const ROLE_COLOURS: Record<string, string> = {
  Beheer:              'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  Bestuur:             'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  MateriaalCommissie:  'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  InstructieKader:     'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  Lid:                 'bg-scuba-100 text-scuba-700 dark:bg-scuba-900/30 dark:text-scuba-300',
};

@Component({
  selector: 'app-role-management',
  standalone: true,
  imports: [NgClass, SpinnerComponent, UserDetailPanelComponent],
  templateUrl: './role-management.component.html',
})
export class RoleManagementComponent {
  private readonly roleService = inject(AdminRoleService);
  private readonly toast = inject(ToastService);

  readonly loading = signal(true);
  readonly roles   = signal<Role[]>(ALL_ROLES);
  readonly users   = signal<UserSummary[]>([]);
  readonly selectedUser = signal<UserSummary | null>(null);

  constructor() {
    this.loadAll();
  }

  private loadAll(): void {
    this.loading.set(true);

    this.roleService.getUsersWithRoles().subscribe({
      next: (list) => {
        this.users.set(list.map(u => ({
          id: u.id,
          email: u.email,
          userName: u.displayName ?? u.email,
          roles: u.roles,
        })));
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.error('Kon gebruikers niet laden.');
      },
    });
  }

  openPanel(user: UserSummary): void {
    this.selectedUser.set(user);
  }

  closePanel(): void {
    this.selectedUser.set(null);
  }

  onEmailChanged(event: { userId: string; email: string }): void {
    this.users.update(list =>
      list.map(u => u.id === event.userId
        ? { ...u, email: event.email, userName: event.email }
        : u
      )
    );
  }

  roleBadgeClass(role: string): string {
    return ROLE_COLOURS[role] ?? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
  }
}
