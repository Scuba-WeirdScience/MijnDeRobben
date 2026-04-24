import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminMemberService } from '../services/admin-member.service';
import { Member, PagedResult } from '../../members/models/member.model';
import { SpinnerComponent } from '../../../shared/components/spinner/spinner.component';
import { MemberStatusPipe } from '../../../shared/pipes/member-status.pipe';
import { FullNamePipe } from '../../../shared/pipes/full-name.pipe';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { MemberFormComponent } from './member-form/member-form.component';
import { MemberDeleteDialogComponent } from './member-delete-dialog/member-delete-dialog.component';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-member-management',
  standalone: true,
  imports: [
    FormsModule,
    SpinnerComponent,
    MemberStatusPipe,
    FullNamePipe,
    MemberFormComponent,
    MemberDeleteDialogComponent,
    DatePipe
  ],
  templateUrl: './member-management.component.html',
})
export class MemberManagementComponent {
  private readonly adminMemberService = inject(AdminMemberService);
  private readonly toast = inject(ToastService);

  readonly result = signal<PagedResult<Member> | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly page = signal(1);
  readonly pageSize = 20;
  readonly showForm = signal(false);
  readonly selectedMember = signal<Member | null>(null);
  readonly memberToDelete = signal<Member | null>(null);
  searchTerm = '';
  private searchTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.error.set(null);
    this.adminMemberService.getAll(this.page(), this.pageSize, this.searchTerm).subscribe({
      next: res => { this.result.set(res); this.loading.set(false); },
      error: () => { this.error.set('Kon leden niet laden.'); this.loading.set(false); }
    });
  }

  onSearch() {
    if (this.searchTimeout) clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => { this.page.set(1); this.load(); }, 350);
  }

  changePage(p: number) { this.page.set(p); this.load(); }

  openForm(member: Member | null = null) {
    this.selectedMember.set(member);
    this.showForm.set(true);
  }

  closeForm() {
    this.showForm.set(false);
    this.selectedMember.set(null);
  }

  onSaved() {
    this.closeForm();
    this.load();
    this.toast.success('Lid succesvol opgeslagen.');
  }

  confirmDelete(member: Member) {
    this.memberToDelete.set(member);
  }

  onDeleteConfirmed() {
    const member = this.memberToDelete();
    if (!member) return;
    this.adminMemberService.delete(member.id).subscribe({
      next: () => {
        this.memberToDelete.set(null);
        this.load();
        this.toast.success('Lid verwijderd.');
      },
      error: () => this.toast.error('Verwijderen mislukt.')
    });
  }

  resendUitnodiging(member: Member) {
    this.adminMemberService.resendUitnodiging(member.id).subscribe({
      next: () => this.toast.success(`Uitnodiging opnieuw verstuurd naar ${member.email}.`),
      error: () => this.toast.error('Versturen mislukt.')
    });
  }
}
