import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { BrevetTypeService, BrevetTypeDef } from './brevet-type.service';
import { ToastService } from '../../../shared/components/toast/toast.service';
import {
  SpinnerComponent,
  FormFieldComponent, InputComponent, SelectComponent,
  ButtonComponent, SidePanelComponent, ConfirmDialogComponent,
  PageHeaderComponent, BadgeComponent, EmptyStateComponent,
} from '../../../shared/components/design-system';
import { FieldTree, form } from '@angular/forms/signals';
import {
  ORGANISATIES,
  Organisatie,
} from '../../../../generated/api-schemas';
import {
  brevetTypeDefFormSchema,
  type BrevetTypeDefForm,
} from '../../../shared/form-schemas';
import { LucideChevronDown } from '../../../shared/lucide-icons';

type BrevetTypeDefFormField = FieldTree<BrevetTypeDefForm>;

@Component({
  selector: 'app-brevet-type-management',
  standalone: true,
  imports: [SpinnerComponent, FormFieldComponent, InputComponent, SelectComponent,
             ButtonComponent, SidePanelComponent, ConfirmDialogComponent,
             PageHeaderComponent, BadgeComponent, EmptyStateComponent, LucideChevronDown],
  templateUrl: './brevet-type-management.component.html',
})
export class BrevetTypeManagementComponent implements OnInit {
  private readonly service = inject(BrevetTypeService);
  private readonly toast = inject(ToastService);

  readonly organisaties = [...ORGANISATIES];

  // ── State ─────────────────────────────────────────────────────────────────
  readonly loading = signal(false);
  readonly items = signal<BrevetTypeDef[]>([]);
  readonly selectedOrg = signal<Organisatie | null>(null);
  readonly saving = signal(false);
  readonly showForm = signal(false);
  readonly editItem = signal<BrevetTypeDef | null>(null);
  readonly itemToDelete = signal<BrevetTypeDef | null>(null);
  readonly isExpanded = signal(true);

  readonly filtered = computed<BrevetTypeDef[]>(() => {
    const org = this.selectedOrg();
    return org ? this.items().filter(i => i.organisatie === org) : this.items();
  });

  // ── Signal form — initialized in constructor (requires injection context) ─
  readonly formModel = signal<BrevetTypeDefForm>({
    organisatie: '',
    naam: '',
    volgorde: 0,
  });
  readonly formState: BrevetTypeDefFormField;

  constructor() {
    this.formState = form<BrevetTypeDefForm>(this.formModel, brevetTypeDefFormSchema as any);
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.loadAll();
  }

  private loadAll(): void {
    this.loading.set(true);
    this.service.getAll().subscribe({
      next: list => { this.items.set(list); this.loading.set(false); },
      error: () => { this.loading.set(false); this.toast.error('Kon brevet types niet laden.'); }
    });
  }

  // ── Tab ───────────────────────────────────────────────────────────────────
  tabClass(org: Organisatie | null): string {
    const active = this.selectedOrg() === org;
    return active
      ? 'px-3 py-1.5 rounded-full text-sm font-medium bg-scuba-600 text-white transition-colors'
      : 'px-3 py-1.5 rounded-full text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors';
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  protected firstError(field: { errors(): readonly { message?: string }[] }): string {
    const errs = field.errors();
    return errs.length > 0 ? (errs[0].message ?? '') : '';
  }

  protected volgordeAsString = computed(() => String(this.formModel().volgorde ?? 0));
  protected onVolgordeInput(value: string): void {
    this.formModel.update(m => ({ ...m, volgorde: Number(value) || 0 }));
  }

  // ── Form ──────────────────────────────────────────────────────────────────
  openForm(item: BrevetTypeDef | null = null): void {
    this.editItem.set(item);
    this.formModel.set({
      organisatie: item?.organisatie ?? '',
      naam: item?.naam ?? '',
      volgorde: item?.volgorde ?? 0,
    });
    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
    this.editItem.set(null);
  }

  save(): void {
    if (!this.formState().valid()) {
      this.formState.organisatie().markAsTouched();
      this.formState.naam().markAsTouched();
      this.formState.volgorde().markAsTouched();
      return;
    }

    this.saving.set(true);
    const dto = {
      organisatie: this.formModel().organisatie as Organisatie,
      naam: this.formModel().naam.trim(),
      volgorde: this.formModel().volgorde ?? 0,
    };

    const existing = this.editItem();
    const req$ = existing
      ? this.service.update(existing.id, dto)
      : this.service.create(dto);

    req$.subscribe({
      next: () => {
        this.saving.set(false);
        this.closeForm();
        this.loadAll();
        this.toast.success(existing ? 'Brevet type bijgewerkt.' : 'Brevet type toegevoegd.');
      },
      error: () => {
        this.saving.set(false);
        this.toast.error('Opslaan mislukt. Probeer opnieuw.');
      }
    });
  }

  confirmDelete(item: BrevetTypeDef): void {
    this.itemToDelete.set(item);
  }

  onDeleteConfirmed(): void {
    const item = this.itemToDelete();
    if (!item) return;
    this.service.delete(item.id).subscribe({
      next: () => {
        this.itemToDelete.set(null);
        this.loadAll();
        this.toast.success('Brevet type verwijderd.');
      },
      error: () => this.toast.error('Verwijderen mislukt.')
    });
  }
}
