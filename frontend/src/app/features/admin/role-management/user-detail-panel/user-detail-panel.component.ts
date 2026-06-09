import {
  Component,
  input,
  output,
  OnInit,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminRoleService } from '../../services/admin-role.service';
import { MemberService, Member } from '../../../../features/members/services/member.service';
import { ToastService } from '../../../../shared/components/toast/toast.service';
import {
  ButtonComponent,
  SidePanelComponent,
  SpinnerComponent,
} from '../../../../shared/components/design-system';

export interface UserSummary {
  id: string;
  email: string;
  userName: string;
  roles: string[];
}

@Component({
  selector: 'app-user-detail-panel',
  standalone: true,
  imports: [FormsModule, SidePanelComponent, ButtonComponent, SpinnerComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './user-detail-panel.component.html',
})
export class UserDetailPanelComponent implements OnInit {
  readonly user = input.required<UserSummary>();
  readonly allRoles = input.required<string[]>();

  /** Emitted when the panel should close; carries updated email if it changed */
  readonly closed = output<void>();
  /** Emitted after a successful email update so the parent can refresh its list */
  readonly emailChanged = output<{ userId: string; email: string }>();

  private readonly roleService = inject(AdminRoleService);
  private readonly memberService = inject(MemberService);
  private readonly toast = inject(ToastService);

  // ── state ──────────────────────────────────────────────────────────────
  readonly loading = signal(true);
  readonly rolesBusy = signal(false);
  readonly emailBusy = signal(false);
  readonly passwordBusy = signal(false);
  readonly ledenBusy = signal(false);

  readonly userRoles = signal<string[]>([]);
  readonly gekoppeldeLeden = signal<Member[]>([]);
  readonly ledenSearchResults = signal<Member[]>([]);
  readonly emailError = signal('');
  readonly passwordError = signal('');

  selectedRole = '';
  emailDraft = '';
  newPassword = '';
  confirmPassword = '';
  ledenSearch = '';

  readonly availableRoles = computed(() =>
    this.allRoles().filter((r) => !this.userRoles().includes(r))
  );

  // ── lifecycle ──────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.emailDraft = this.user().email;
    this.roleService.getUserRoles(this.user().id).subscribe({
      next: (roles) => {
        this.userRoles.set(roles);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.error('Kon rollen niet laden.');
      },
    });
    this._loadGekoppeldeLeden();
  }

  private _loadGekoppeldeLeden(): void {
    // Fetch all members and filter by verzorgerIds containing this user's UID
    this.memberService.getAll(1, 200).subscribe({
      next: (result) => {
        const gekoppeld = result.items.filter((m) => m.verzorgerIds?.includes(this.user().id));
        this.gekoppeldeLeden.set(gekoppeld);
      },
      error: () => {
        /* silently ignore */
      },
    });
  }

  // ── roles ──────────────────────────────────────────────────────────────
  addRole(): void {
    const role = this.selectedRole;
    if (!role) return;
    this.rolesBusy.set(true);
    this.roleService.assignRole(this.user().id, role).subscribe({
      next: () => {
        this.userRoles.update((r) => [...r, role]);
        this.selectedRole = '';
        this.rolesBusy.set(false);
        this.toast.success(`Rol '${role}' toegewezen.`);
      },
      error: () => {
        this.rolesBusy.set(false);
        this.toast.error('Toewijzen mislukt.');
      },
    });
  }

  removeRole(role: string): void {
    this.rolesBusy.set(true);
    this.roleService.removeRole(this.user().id, role).subscribe({
      next: () => {
        this.userRoles.update((r) => r.filter((x) => x !== role));
        this.rolesBusy.set(false);
        this.toast.success(`Rol '${role}' verwijderd.`);
      },
      error: () => {
        this.rolesBusy.set(false);
        this.toast.error('Verwijderen mislukt.');
      },
    });
  }

  // ── email ──────────────────────────────────────────────────────────────
  saveEmail(): void {
    const email = this.emailDraft.trim();
    if (!email || email === this.user().email) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      this.emailError.set('Voer een geldig e-mailadres in.');
      return;
    }

    this.emailBusy.set(true);
    this.roleService.updateEmail(this.user().id, email).subscribe({
      next: () => {
        this.emailBusy.set(false);
        this.toast.success('E-mailadres bijgewerkt.');
        this.emailChanged.emit({ userId: this.user().id, email });
      },
      error: (err) => {
        this.emailBusy.set(false);
        const msg = err?.error?.error ?? 'E-mail opslaan mislukt.';
        this.emailError.set(msg);
      },
    });
  }

  // ── password ───────────────────────────────────────────────────────────
  savePassword(): void {
    if (!this.newPassword) return;
    if (this.newPassword !== this.confirmPassword) {
      this.passwordError.set('Wachtwoorden komen niet overeen.');
      return;
    }
    if (this.newPassword.length < 8) {
      this.passwordError.set('Wachtwoord moet minimaal 8 tekens bevatten.');
      return;
    }

    this.passwordBusy.set(true);
    this.roleService.resetPassword(this.user().id, this.newPassword).subscribe({
      next: () => {
        this.passwordBusy.set(false);
        this.newPassword = '';
        this.confirmPassword = '';
        this.toast.success('Wachtwoord gewijzigd.');
      },
      error: (err) => {
        this.passwordBusy.set(false);
        const msg = err?.error?.error ?? 'Wachtwoord wijzigen mislukt.';
        this.passwordError.set(msg);
      },
    });
  }

  // ── gekoppelde leden ───────────────────────────────────────────────────
  zoekLeden(): void {
    const q = this.ledenSearch.trim();
    if (!q) {
      this.ledenSearchResults.set([]);
      return;
    }

    this.memberService.getAll(1, 50, q).subscribe({
      next: (result) => {
        // Exclude already-coupled members
        const gekoppeldIds = this.gekoppeldeLeden().map((m) => m.id);
        this.ledenSearchResults.set(result.items.filter((m) => !gekoppeldIds.includes(m.id)));
      },
      error: () => this.toast.error('Zoeken mislukt.'),
    });
  }

  koppelLid(lid: Member): void {
    const huidig = this.gekoppeldeLeden().map((m) => m.id);
    if (huidig.includes(lid.id)) return;

    const nieuweIds = [...(lid.verzorgerIds ?? [])];
    if (!nieuweIds.includes(this.user().id)) nieuweIds.push(this.user().id);

    this.ledenBusy.set(true);
    this.roleService.updateVerzorgerIds(lid.id, nieuweIds).subscribe({
      next: () => {
        this.gekoppeldeLeden.update((l) => [...l, { ...lid, verzorgerIds: nieuweIds }]);
        this.ledenSearchResults.update((r) => r.filter((m) => m.id !== lid.id));
        this.ledenBusy.set(false);
        this.toast.success(`${lid.firstName} ${lid.lastName} gekoppeld.`);
      },
      error: () => {
        this.ledenBusy.set(false);
        this.toast.error('Koppelen mislukt.');
      },
    });
  }

  ontkoppelLid(lid: Member): void {
    const nieuweIds = (lid.verzorgerIds ?? []).filter((id) => id !== this.user().id);

    this.ledenBusy.set(true);
    this.roleService.updateVerzorgerIds(lid.id, nieuweIds).subscribe({
      next: () => {
        this.gekoppeldeLeden.update((l) => l.filter((m) => m.id !== lid.id));
        this.ledenBusy.set(false);
        this.toast.success(`${lid.firstName} ${lid.lastName} ontkoppeld.`);
      },
      error: () => {
        this.ledenBusy.set(false);
        this.toast.error('Ontkoppelen mislukt.');
      },
    });
  }
}
