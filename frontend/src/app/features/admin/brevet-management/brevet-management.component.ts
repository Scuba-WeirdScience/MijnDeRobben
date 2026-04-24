import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminMemberService } from '../services/admin-member.service';
import { SpinnerComponent } from '../../../shared/components/spinner/spinner.component';
import { AuthService } from '../../../core/auth/auth.service';
import { MemberBrevetPanelComponent } from './member-brevet-panel/member-brevet-panel.component';
import { Member } from '../../members/models/member.model';
import { LucideX } from '../../../shared/lucide-icons';

@Component({
  selector: 'app-brevet-management',
  standalone: true,
  imports: [FormsModule, SpinnerComponent, MemberBrevetPanelComponent, LucideX],
  templateUrl: './brevet-management.component.html',
})
export class BrevetManagementComponent {
  private readonly adminMemberService = inject(AdminMemberService);
  private readonly auth = inject(AuthService);

  memberSearch = '';
  private memberSearchTimeout: ReturnType<typeof setTimeout> | null = null;
  readonly membersLoading = signal(false);
  readonly members = signal<Member[]>([]);
  readonly selectedMember = signal<Member | null>(null);

  /** Read-only for Bestuur / Admin — only InstructieKader can edit */
  readonly brevettenReadonly = () => !this.auth.hasRole('InstructieKader');

  onMemberSearch(): void {
    if (this.memberSearchTimeout) clearTimeout(this.memberSearchTimeout);
    if (!this.memberSearch.trim()) { this.members.set([]); return; }
    this.memberSearchTimeout = setTimeout(() => this.loadMembers(), 350);
  }

  private loadMembers(): void {
    this.membersLoading.set(true);
    this.adminMemberService.getAll(1, 20, this.memberSearch).subscribe({
      next: res => { this.members.set(res.items); this.membersLoading.set(false); },
      error: () => { this.membersLoading.set(false); }
    });
  }

  selectMember(m: Member): void {
    this.selectedMember.set(m);
  }
}
