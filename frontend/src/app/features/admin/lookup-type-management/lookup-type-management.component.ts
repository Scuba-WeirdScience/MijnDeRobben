import { Component, inject, input, signal, computed, OnInit } from '@angular/core';
import { TitleCasePipe } from '@angular/common';
import { ToastService } from '../../../shared/components/toast/toast.service';
import {
  SpinnerComponent,
  FormFieldComponent, InputComponent, SelectComponent,
  ButtonComponent, SidePanelComponent, ConfirmDialogComponent,
  PageHeaderComponent, BadgeComponent, EmptyStateComponent,
} from '../../../shared/components/design-system';
import { FieldTree, form } from '@angular/forms/signals';
import { ORGANISATIES, Organisatie } from '../../../../generated/api-schemas';
import { lookupTypeFormSchema, type LookupTypeForm } from '../../../shared/form-schemas';
import { LucideChevronDown } from '../../../shared/lucide-icons';
import { call } from '../../../core/firebase/callable';
import { from } from 'rxjs';

export interface LookupTypeDoc {
  id: string;
  organisatie: string;
  naam: string;
  volgorde: number;
}

export interface LookupTypeConfig {
  /** Dutch page title, e.g. "Brevet types beheer" */
  pageTitle: string;
  /** Dutch section label, e.g. "Brevet types" */
  sectionLabel: string;
  /** Dutch label used in toasts and dialogs, e.g. "brevet type" */
  itemLabel: string;
  /** Dutch form hint for the naam field, e.g. "Bijv. 1-ster, Open Water, ..." */
  naamHint: string;
  getAllFn: string;
  createFn: string;
  updateFn: string;
  deleteFn: string;
}

// Tailwind safelist — do not remove
const _TW_SAFELIST = [
  'px-3', 'py-1.5', 'rounded-full', 'text-sm', 'font-medium',
  'bg-scuba-600', 'text-white', 'transition-colors',
  'bg-scuba-100', 'dark:bg-scuba-900/20', 'text-scuba-700', 'dark:text-scuba-300',
  'hover:bg-scuba-200', 'dark:hover:bg-scuba-800/30',
];

@Component({
  selector: 'app-lookup-type-management',
  standalone: true,
  imports: [
    TitleCasePipe,
    SpinnerComponent, FormFieldComponent, InputComponent, SelectComponent,
    ButtonComponent, SidePanelComponent, ConfirmDialogComponent,
    PageHeaderComponent, BadgeComponent, EmptyStateComponent, LucideChevronDown,
  ],
  templateUrl: './lookup-type-management.component.html',
})
export class LookupTypeManagementComponent implements OnInit {
  readonly config = input.required<LookupTypeConfig>();

  private readonly toast = inject(ToastService);

  readonly organisaties = [...ORGANISATIES];

  // ── State ──────────────────────────────────────────────────────────────────
  readonly loading = signal(false);
  readonly items = signal<LookupTypeDoc[]>([]);
  readonly selectedOrg = signal<Organisatie | null>(null);
  readonly saving = signal(false);
  readonly showForm = signal(false);
  readonly editItem = signal<LookupTypeDoc | null>(null);
  readonly itemToDelete = signal<LookupTypeDoc | null>(null);
  readonly isExpanded = signal(true);

  readonly filtered = computed<LookupTypeDoc[]>(() => {
    const org = this.selectedOrg();
    return org ? this.items().filter(i => i.organisatie === org) : this.items();
  });

  // ── Signal form ────────────────────────────────────────────────────────────
  readonly formModel = signal<LookupTypeForm>({ organisatie: '', naam: '', volgorde: 0 });
  readonly formState: FieldTree<LookupTypeForm>;

  constructor() {
    this.formState = form<LookupTypeForm>(this.formModel, lookupTypeFormSchema as any);
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.loadAll();
  }

  private loadAll(): void {
    this.loading.set(true);
    from(call<void, LookupTypeDoc[]>(this.config().getAllFn)).subscribe({
      next: list => { this.items.set(list); this.loading.set(false); },
      error: () => {
        this.loading.set(false);
        this.toast.error(`Kon ${this.config().sectionLabel.toLowerCase()} niet laden.`);
      },
    });
  }

  // ── Tabs ───────────────────────────────────────────────────────────────────
  tabClass(org: Organisatie | null): string {
    const active = this.selectedOrg() === org;
    return active
      ? 'px-3 py-1.5 rounded-full text-sm font-medium bg-scuba-600 text-white transition-colors'
      : 'px-3 py-1.5 rounded-full text-sm font-medium bg-scuba-100 dark:bg-scuba-900/20 text-scuba-700 dark:text-scuba-300 hover:bg-scuba-200 dark:hover:bg-scuba-800/30 transition-colors';
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

  // ── Form ───────────────────────────────────────────────────────────────────
  openForm(item: LookupTypeDoc | null = null): void {
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
    const cfg = this.config();
    const dto = {
      organisatie: this.formModel().organisatie as Organisatie,
      naam: this.formModel().naam.trim(),
      volgorde: this.formModel().volgorde ?? 0,
    };

    const existing = this.editItem();
    const req$ = existing
      ? from(call<typeof dto & { id: string }, LookupTypeDoc>(cfg.updateFn, { id: existing.id, ...dto }))
      : from(call<typeof dto, LookupTypeDoc>(cfg.createFn, dto));

    req$.subscribe({
      next: () => {
        this.saving.set(false);
        this.closeForm();
        this.loadAll();
        this.toast.success(existing
          ? `${cfg.itemLabel} bijgewerkt.`
          : `${cfg.itemLabel} toegevoegd.`);
      },
      error: () => {
        this.saving.set(false);
        this.toast.error('Opslaan mislukt. Probeer opnieuw.');
      },
    });
  }

  confirmDelete(item: LookupTypeDoc): void {
    this.itemToDelete.set(item);
  }

  onDeleteConfirmed(): void {
    const item = this.itemToDelete();
    if (!item) return;
    from(call<{ id: string }, { success: boolean }>(this.config().deleteFn, { id: item.id })).subscribe({
      next: () => {
        this.itemToDelete.set(null);
        this.loadAll();
        this.toast.success(`${this.config().itemLabel} verwijderd.`);
      },
      error: () => this.toast.error('Verwijderen mislukt.'),
    });
  }
}
