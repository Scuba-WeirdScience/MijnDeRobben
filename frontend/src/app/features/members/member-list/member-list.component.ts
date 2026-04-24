import { Component, inject, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { MemberService } from '../services/member.service';
import { Member, PagedResult } from '../models/member.model';
import { SpinnerComponent } from '../../../shared/components/spinner/spinner.component';
import { MemberStatusPipe } from '../../../shared/pipes/member-status.pipe';
import { UserDisplayComponent } from '../../../shared/components/user-display/user-display.component';
import { AuthService } from '../../../core/auth/auth.service';

const ADMIN_ROLES = ['Beheer', 'Bestuur', 'MateriaalCommissie', 'InstructieKader'];

@Component({
  selector: 'app-member-list',
  standalone: true,
  imports: [RouterLink, FormsModule, SpinnerComponent, MemberStatusPipe, UserDisplayComponent, DatePipe],
  templateUrl: './member-list.component.html',
})
export class MemberListComponent {
  private readonly memberService = inject(MemberService);
  private readonly auth = inject(AuthService);

  readonly isAdmin = computed(() => this.auth.hasAnyRole(ADMIN_ROLES));
  readonly result = signal<PagedResult<Member> | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly page = signal(1);
  readonly pageSize = 20;
  searchTerm = '';
  private searchTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.error.set(null);
    this.memberService.getAll(this.page(), this.pageSize, this.searchTerm).subscribe({
      next: res => { this.result.set(res); this.loading.set(false); },
      error: () => { this.error.set('Kon leden niet laden.'); this.loading.set(false); }
    });
  }

  onSearch() {
    if (this.searchTimeout) clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      this.page.set(1);
      this.load();
    }, 350);
  }

  changePage(p: number) {
    this.page.set(p);
    this.load();
  }

}
