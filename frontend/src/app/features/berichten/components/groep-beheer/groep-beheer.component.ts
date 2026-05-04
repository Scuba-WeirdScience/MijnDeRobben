import { Component, inject, signal, computed } from '@angular/core';
import { BerichtenService, Groep } from '../../berichten.service';
import { ToastService } from '../../../../shared/components/toast/toast.service';
import { MemberService, Member } from '../../../../features/members/services/member.service';
import {
  ButtonComponent,
  SpinnerComponent,
  EmptyStateComponent,
  FormFieldComponent,
  InputComponent,
  TextareaComponent,
  ConfirmDialogComponent,
  PageContainerComponent,
} from '../../../../shared/components/design-system';
import { LucideX } from '../../../../shared/lucide-icons';

// Tailwind safelist — do NOT remove
const _TW_SAFELIST = [
  'focus:ring-scuba-500', 'focus:outline-none',
  'hover:bg-gray-50', 'dark:hover:bg-gray-700/50',
  'bg-scuba-100', 'dark:bg-scuba-800', 'text-scuba-700', 'dark:text-scuba-300',
  'hover:bg-scuba-200', 'dark:hover:bg-scuba-700',
];

@Component({
  selector: 'app-groep-beheer',
  standalone: true,
  imports: [
    ButtonComponent,
    SpinnerComponent,
    EmptyStateComponent,
    FormFieldComponent,
    InputComponent,
    TextareaComponent,
    ConfirmDialogComponent,
    PageContainerComponent,
    LucideX,
  ],
  templateUrl: './groep-beheer.component.html',
})
export class GroepBeheerComponent {
  readonly service = inject(BerichtenService);
  private readonly toast = inject(ToastService);
  private readonly memberService = inject(MemberService);

  // Form panel
  readonly formOpen = signal(false);
  readonly editingGroep = signal<Groep | null>(null);
  readonly formName = signal('');
  readonly formDescription = signal('');
  readonly saving = signal(false);

  // Member picker
  readonly allMembers = signal<Member[]>([]);
  readonly selectedUids = signal<string[]>([]);
  readonly memberSearch = signal('');
  readonly dropdownOpen = signal(false);

  // Delete
  readonly deleteTarget = signal<Groep | null>(null);
  readonly deleting = signal(false);

  // Search
  readonly search = signal('');
  readonly filteredGroepen = computed(() => {
    const q = this.search().toLowerCase().trim();
    if (!q) return this.service.allGroepen();
    return this.service.allGroepen().filter(g =>
      g.name.toLowerCase().includes(q) || g.description?.toLowerCase().includes(q)
    );
  });

  readonly selectedMembers = computed(() => {
    const uids = this.selectedUids();
    return this.allMembers().filter(m => uids.includes(m.userId));
  });

  readonly availableMembers = computed(() => {
    const uids = this.selectedUids();
    const search = this.memberSearch().toLowerCase();
    return this.allMembers().filter(m => {
      if (uids.includes(m.userId)) return false;
      if (!search) return true;
      return (
        m.firstName.toLowerCase().includes(search) ||
        m.lastName.toLowerCase().includes(search) ||
        m.email.toLowerCase().includes(search)
      );
    });
  });

  constructor() {
    this.memberService.getAll(1, 200, '').subscribe(result => {
      this.allMembers.set(result.items);
    });
  }

  openCreate(): void {
    this.editingGroep.set(null);
    this.formName.set('');
    this.formDescription.set('');
    this.selectedUids.set([]);
    this.memberSearch.set('');
    this.formOpen.set(true);
  }

  openEdit(groep: Groep): void {
    this.editingGroep.set(groep);
    this.formName.set(groep.name);
    this.formDescription.set(groep.description);
    this.selectedUids.set([...groep.memberUids]);
    this.memberSearch.set('');
    this.formOpen.set(true);
  }

  addMember(uid: string): void {
    this.selectedUids.set([...this.selectedUids(), uid]);
    this.memberSearch.set('');
    this.dropdownOpen.set(false);
  }

  removeSelectedMember(uid: string): void {
    this.selectedUids.set(this.selectedUids().filter(u => u !== uid));
  }

  toggleMember(uid: string): void {
    const current = this.selectedUids();
    if (current.includes(uid)) {
      this.selectedUids.set(current.filter(u => u !== uid));
    } else {
      this.selectedUids.set([...current, uid]);
    }
  }

  isSelected(uid: string): boolean {
    return this.selectedUids().includes(uid);
  }

  onSearchBlur(): void {
    // Small delay so mousedown on dropdown item fires before blur closes it
    setTimeout(() => this.dropdownOpen.set(false), 150);
  }

  async save(): Promise<void> {
    const name = this.formName().trim();
    const description = this.formDescription().trim();
    const memberUids = this.selectedUids();

    if (!name) {
      this.toast.warning('Vul een naam in.');
      return;
    }

    this.saving.set(true);
    try {
      const editing = this.editingGroep();
      if (editing) {
        await this.service.updateGroep({ groepId: editing.id, name, description, memberUids });
        this.toast.success('Groep bijgewerkt.');
      } else {
        await this.service.createGroep({ name, description, memberUids });
        this.toast.success('Groep aangemaakt.');
      }
      this.formOpen.set(false);
    } catch {
      this.toast.error('Groep kon niet worden opgeslagen.');
    } finally {
      this.saving.set(false);
    }
  }

  confirmDelete(groep: Groep): void {
    this.deleteTarget.set(groep);
  }

  async executeDelete(): Promise<void> {
    const target = this.deleteTarget();
    if (!target) return;
    this.deleting.set(true);
    try {
      await this.service.deleteGroep(target.id);
      this.deleteTarget.set(null);
      this.toast.success('Groep verwijderd.');
    } catch {
      this.toast.error('Groep kon niet worden verwijderd.');
    } finally {
      this.deleting.set(false);
    }
  }
}
