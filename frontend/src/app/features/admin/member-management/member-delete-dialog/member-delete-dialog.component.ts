import { Component, computed, input, output } from '@angular/core';
import { Member } from '../../../members/models/member.model';
import { ConfirmDialogComponent } from '../../../../shared/components/design-system';

@Component({
  selector: 'app-member-delete-dialog',
  standalone: true,
  imports: [ConfirmDialogComponent],
  templateUrl: './member-delete-dialog.component.html',
})
export class MemberDeleteDialogComponent {
  readonly member    = input.required<Member>();
  readonly confirmed = output<void>();
  readonly cancelled = output<void>();

  readonly message = computed(() => {
    const m = this.member();
    const name = [m.firstName, m.lastName].filter(Boolean).join(' ');
    return `Ben je zeker dat je ${name} wil verwijderen? Deze actie kan niet ongedaan worden gemaakt.`;
  });
}
