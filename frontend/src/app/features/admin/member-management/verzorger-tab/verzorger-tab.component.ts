import { Component, inject, input, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { VerzorgerService, VerzorgerInfo } from '../../../members/services/verzorger.service';
import { MemberService } from '../../../members/services/member.service';
import { Member } from '../../../members/services/member.service';
import { ToastService } from '../../../../shared/components/toast/toast.service';
import { SpinnerComponent, ButtonComponent } from '../../../../shared/components/design-system';

type View = 'list' | 'add-existing' | 'add-new';

// Tailwind safelist — do NOT remove
const _TW_SAFELIST = [
  'border-scuba-600', 'dark:border-scuba-400', 'text-scuba-600', 'dark:text-scuba-400',
  'hover:text-scuba-600', 'dark:hover:text-scuba-400', 'border-transparent',
];

@Component({
  selector: 'app-verzorger-tab',
  standalone: true,
  imports: [FormsModule, SpinnerComponent, ButtonComponent],
  templateUrl: './verzorger-tab.component.html',
})
export class VerzorgerTabComponent implements OnInit {
  readonly memberId = input.required<string>();

  private readonly verzorgerService = inject(VerzorgerService);
  private readonly memberService = inject(MemberService);
  private readonly toast = inject(ToastService);

  readonly view = signal<View>('list');
  readonly verzorgers = signal<VerzorgerInfo[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  // Add-existing state
  readonly searchTerm = signal('');
  readonly searchResults = signal<Member[]>([]);
  readonly searching = signal(false);
  private searchTimeout: ReturnType<typeof setTimeout> | null = null;

  // Add-new state
  newEmail = '';
  newFirstName = '';
  newLastName = '';
  readonly newFormError = signal<string | null>(null);

  ngOnInit(): void {
    this.loadVerzorgers();
  }

  loadVerzorgers(): void {
    this.loading.set(true);
    this.verzorgerService.getVerzorgers(this.memberId()).subscribe({
      next: list => { this.verzorgers.set(list); this.loading.set(false); },
      error: () => { this.loading.set(false); this.toast.error('Verzorgers laden mislukt.'); },
    });
  }

  showAddExisting(): void {
    this.searchTerm.set('');
    this.searchResults.set([]);
    this.error.set(null);
    this.view.set('add-existing');
  }

  showAddNew(): void {
    this.newEmail = '';
    this.newFirstName = '';
    this.newLastName = '';
    this.newFormError.set(null);
    this.view.set('add-new');
  }

  backToList(): void {
    this.view.set('list');
  }

  onSearchInput(value: string): void {
    this.searchTerm.set(value);
    if (this.searchTimeout) clearTimeout(this.searchTimeout);
    if (!value.trim()) { this.searchResults.set([]); return; }
    this.searchTimeout = setTimeout(() => {
      this.searching.set(true);
      this.memberService.getAll(1, 10, value).subscribe({
        next: res => { this.searchResults.set(res.items); this.searching.set(false); },
        error: () => { this.searching.set(false); },
      });
    }, 350);
  }

  linkMember(member: Member): void {
    this.saving.set(true);
    this.verzorgerService.addVerzorger(this.memberId(), member.userId).subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.success(`${member.firstName} ${member.lastName} gekoppeld als verzorger.`);
        this.loadVerzorgers();
        this.view.set('list');
      },
      error: (err) => {
        this.saving.set(false);
        const msg = err?.error?.message ?? err?.message ?? 'Koppelen mislukt.';
        this.error.set(msg);
      },
    });
  }

  createAndLink(): void {
    this.newFormError.set(null);
    if (!this.newFirstName.trim()) { this.newFormError.set('Voornaam is verplicht.'); return; }
    if (!this.newLastName.trim()) { this.newFormError.set('Achternaam is verplicht.'); return; }
    if (!this.newEmail.trim()) { this.newFormError.set('E-mailadres is verplicht.'); return; }

    this.saving.set(true);
    this.verzorgerService.createVerzorgerUser(
      this.memberId(), this.newEmail.trim(), this.newFirstName.trim(), this.newLastName.trim()
    ).subscribe({
      next: (v) => {
        this.saving.set(false);
        this.toast.success(`${v.firstName} ${v.lastName} aangemaakt en gekoppeld als verzorger.`);
        this.loadVerzorgers();
        this.view.set('list');
      },
      error: (err) => {
        this.saving.set(false);
        const msg = err?.error?.message ?? err?.message ?? 'Aanmaken mislukt.';
        this.newFormError.set(msg);
      },
    });
  }

  unlink(verzorger: VerzorgerInfo): void {
    this.verzorgerService.removeVerzorger(this.memberId(), verzorger.uid).subscribe({
      next: () => {
        this.toast.success(`${verzorger.firstName} ${verzorger.lastName} ontkoppeld.`);
        this.loadVerzorgers();
      },
      error: () => this.toast.error('Ontkoppelen mislukt.'),
    });
  }
}
