import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MemberService } from '../services/member.service';
import { Member } from '../services/member.service';
import { SpinnerComponent } from '../../../shared/components/spinner/spinner.component';
import { MemberStatusPipe } from '../../../shared/pipes/member-status.pipe';
import { FullNamePipe } from '../../../shared/pipes/full-name.pipe';
import { DatePipe } from '@angular/common';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-member-detail',
  standalone: true,
  imports: [RouterLink, SpinnerComponent, MemberStatusPipe, FullNamePipe, DatePipe],
  templateUrl: './member-detail.component.html',
})
export class MemberDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly memberService = inject(MemberService);
  readonly auth = inject(AuthService);

  readonly member = signal<Member | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  constructor() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loading.set(true);
      this.memberService.getById(id).subscribe({
        next: m => { this.member.set(m); this.loading.set(false); },
        error: () => { this.error.set('Lid niet gevonden.'); this.loading.set(false); }
      });
    }
  }
}
