import { Component, input, output, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { z } from 'zod';
import { MemberService } from '../../../members/services/member.service';
import { Member } from '../../../members/services/member.service';
import { createSignalForm } from '../../../../shared/forms/signal-form';
import { ToastService } from '../../../../shared/components/toast/toast.service';
import { LocaleDateInputComponent } from '../../../../shared/components/locale-date-input/locale-date-input.component';
import { ButtonComponent, SidePanelComponent, SpinnerComponent, FormFieldComponent } from '../../../../shared/components/design-system';
import { AuthService } from '../../../../core/auth/auth.service';
import { MemberBrevetPanelComponent } from '../../brevet-management/member-brevet-panel/member-brevet-panel.component';
import { LeningService, LeningDoc } from '../../../lening/lening.service';
import { LucideTriangleAlert } from '../../../../shared/lucide-icons';

// ── Local form schema ──────────────────────────────────────────────────────
// Uses email for create (instead of userId — the backend creates the Auth account).
const MemberFormSchema = z.object({
  email: z
    .string()
    .email('Voer een geldig e-mailadres in.')
    .optional(),
  firstName: z
    .string()
    .min(1, 'Voornaam is verplicht')
    .max(100, 'Voornaam mag maximaal 100 tekens bevatten'),
  lastName: z
    .string()
    .min(1, 'Achternaam is verplicht')
    .max(100, 'Achternaam mag maximaal 100 tekens bevatten'),
  dateOfBirth: z
    .string()
    .min(1, 'Geboortedatum is verplicht')
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Datum moet in formaat JJJJ-MM-DD zijn'),
  joinDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Datum moet in formaat JJJJ-MM-DD zijn')
    .or(z.literal(''))
    .default(''),
  isActive: z.boolean(),
  endOfMembership: z.string().nullable().default(null),
});

type MemberFormValue = z.infer<typeof MemberFormSchema>;
type TextField = 'email' | 'firstName' | 'lastName' | 'dateOfBirth' | 'joinDate' | 'endOfMembership';
type Tab = 'gegevens' | 'brevetten' | 'leningen';

const EMPTY: MemberFormValue = {
  email:       '',
  firstName:   '',
  lastName:    '',
  dateOfBirth: '',
  joinDate:    '',
  isActive:    true,
  endOfMembership: null,
};

// ── Tailwind safelist — do NOT remove ──────────────────────────────────────
const _TW_SAFELIST = [
  'bg-amber-50', 'dark:bg-amber-900/20', 'border-amber-200', 'dark:border-amber-700',
  'text-amber-700', 'dark:text-amber-300', 'text-amber-500',
];

@Component({
  selector: 'app-member-form',
  standalone: true,
  imports: [FormsModule, LocaleDateInputComponent, SidePanelComponent, ButtonComponent, SpinnerComponent, MemberBrevetPanelComponent, LucideTriangleAlert, FormFieldComponent],
  templateUrl: './member-form.component.html',
})
export class MemberFormComponent implements OnInit {
  readonly member = input<Member | null>(null);
  readonly saved = output<void>();
  readonly cancelled = output<void>();

  private readonly adminMemberService = inject(MemberService);
  private readonly toast = inject(ToastService);
  private readonly auth = inject(AuthService);
  private readonly leningService = inject(LeningService);

  readonly saving = signal(false);
  readonly submitError = signal<string | null>(null);
  readonly activeTab = signal<Tab>('gegevens');
  readonly today = signal(new Date().toISOString().split('T')[0]);

  /** Lenings for the member (loaded if user has correct role) */
  readonly leningen = signal<LeningDoc[]>([]);
  readonly leningenLoading = signal(false);

  /** Check if user can view leningen */
  readonly canViewLeningen = () => this.auth.hasAnyRole(['Beheer', 'Bestuur', 'MateriaalCommissie']);

  readonly form = createSignalForm(MemberFormSchema, EMPTY);

  /** Read-only if the user does NOT have InstructieKader role */
  readonly brevettenReadonly = () => !this.auth.hasRole('InstructieKader');

  ngOnInit(): void {
    const m = this.member();
    if (m) {
      this.form.reset({
        firstName:   m.firstName,
        lastName:    m.lastName,
        dateOfBirth: m.dateOfBirth?.substring(0, 10) ?? '',
        joinDate:    m.joinDate?.substring(0, 10) ?? '',
        isActive:    m.isActive,
        endOfMembership: m.endOfMembership ?? null,
      });

      if (this.canViewLeningen()) {
        this.leningenLoading.set(true);
        this.leningService.getByMemberId(m.id).subscribe({
          next: list => { this.leningen.set(list); this.leningenLoading.set(false); },
          error: () => { this.leningenLoading.set(false); }
        });
      }
    }
  }

  setText(field: TextField, value: string): void {
    const f = this.form.fields[field];
    if (!f) return;
    f.value.set(value);
    f.touched.set(true);
  }

  onSubmit(): void {
    this.submitError.set(null);
    this.form.markAllTouched();

    const val = this.form.getValue() as MemberFormValue;

    // Extra guard: email is required for create
    if (!this.member() && !val?.email?.trim()) {
      this.submitError.set('E-mailadres is verplicht.');
      return;
    }

    if (!this.form.valid()) {
      this.submitError.set('Vul alle verplichte velden correct in.');
      return;
    }

    this.saving.set(true);
    const payload = {
      firstName:   val!.firstName,
      lastName:    val!.lastName,
      dateOfBirth: val!.dateOfBirth,
      joinDate:    val!.joinDate || undefined,
      isActive:    val!.isActive,
      endOfMembership: val!.endOfMembership || null,
    };

    const m = this.member();
    const obs = m
      ? this.adminMemberService.update(m.id, payload)
      : this.adminMemberService.adminCreate({
          ...payload,
          email: val!.email!,
          joinDate: payload.joinDate ?? new Date().toISOString().split('T')[0],
        });

    obs.subscribe({
      next:  () => { this.saving.set(false); this.saved.emit(); },
      error: (err) => {
        this.saving.set(false);
        const message = err?.error?.error ?? err?.message ?? 'Opslaan mislukt. Probeer het opnieuw.';
        this.submitError.set(message);
        this.toast.error(message);
      },
    });
  }

  tabClass(tab: Tab): string {
    const active = this.activeTab() === tab;
    return active
      ? 'px-5 py-3 text-sm font-semibold text-scuba-600 dark:text-scuba-400 border-b-2 border-scuba-600 dark:border-scuba-400 -mb-px transition-colors'
      : 'px-5 py-3 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-scuba-600 dark:hover:text-scuba-400 border-b-2 border-transparent -mb-px transition-colors';
  }
}
