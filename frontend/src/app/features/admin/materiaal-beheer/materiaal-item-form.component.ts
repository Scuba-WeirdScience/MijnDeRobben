import {
  Component, input, output, inject, signal, computed, effect,
} from '@angular/core';
import { ButtonComponent, FormFieldComponent, InputComponent, SidePanelComponent, TextareaComponent } from '../../../shared/components/design-system';
import { FieldTree, form } from '@angular/forms/signals';
import { CustomPropertyDef, Materiaal } from '../../../../generated/api-schemas';
import { materiaalFormSchema, type MateriaalForm } from '../../../shared/form-schemas';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { MateriaalService } from './materiaal.service';
import { MateriaalLeningHistoryComponent } from './materiaal-lening-history.component';

@Component({
  selector: 'app-materiaal-item-form',
  standalone: true,
  imports: [SidePanelComponent, ButtonComponent, FormFieldComponent, InputComponent, TextareaComponent, MateriaalLeningHistoryComponent],
  templateUrl: './materiaal-item-form.component.html',
})
export class MateriaalItemFormComponent {
  private readonly materiaalService = inject(MateriaalService);
  private readonly toast = inject(ToastService);

  // ── Inputs ──────────────────────────────────────────────────────────────
  readonly materiaal = input<Materiaal | null>(null);
  readonly materiaalTypeId = input.required<string>();
  readonly customPropertyDefs = input<CustomPropertyDef[]>([]);

  // ── Outputs ───────────────────────────────────────────────────────────
  readonly saved = output<void>();
  readonly cancelled = output<void>();

  // ── State ────────────────────────────────────────────────────────────
  readonly saving = signal(false);

  // Signal form for materiaal form fields — initialized in constructor (requires injection context)
  readonly formModel = signal<MateriaalForm>({
    naam: '',
    serienummer: '',
    aankoopDatum: '',
    notities: '',
  });
  readonly materiaalFormState: FieldTree<MateriaalForm>;

  readonly materiaalFormCustomProperties = signal<Partial<Record<string, string>>>({});

  // ── Computed helpers ──────────────────────────────────────────────────
  readonly editingMateriaal = computed(() => this.materiaal());

  readonly materiaalNaam = computed(() => this.formModel().naam);
  setMateriaalNaam(v: string): void { this.formModel.update(m => ({ ...m, naam: v })); }

  get materiaalSerienummer(): string { return this.formModel().serienummer ?? ''; }
  set materiaalSerienummer(v: string) { this.formModel.update(m => ({ ...m, serienummer: v })); }

  get materiaalAankoopDatum(): string { return this.formModel().aankoopDatum ?? ''; }
  set materiaalAankoopDatum(v: string) { this.formModel.update(m => ({ ...m, aankoopDatum: v })); }

  get materiaalNotities(): string { return this.formModel().notities ?? ''; }
  set materiaalNotities(v: string) { this.formModel.update(m => ({ ...m, notities: v })); }

  protected firstError(field: { errors(): readonly { message?: string }[] }): string {
    const errs = field.errors();
    return errs.length > 0 ? (errs[0].message ?? '') : '';
  }

  setCustomProp(key: string, value: string): void {
    this.materiaalFormCustomProperties.update(m => ({ ...m, [key]: value }));
  }

  // ── Lifecycle ───────────────────────────────────────────────────────────
  constructor() {
    // form() calls inject() internally — must be called in injection context (constructor)
    this.materiaalFormState = form<MateriaalForm>(this.formModel, materiaalFormSchema as any);

    // Watch input and populate form when materiaal changes
    effect(() => {
      const m = this.materiaal();
      this.formModel.set({
        naam: m?.naam ?? '',
        serienummer: m?.serienummer ?? '',
        aankoopDatum: m?.aankoopDatum ?? '',
        notities: m?.notities ?? '',
      });
      this.materiaalFormCustomProperties.set(m?.customProperties ? { ...m.customProperties } : {});
    }, { allowSignalWrites: true });
  }

  // ── Save ───────────────────────────────────────────────────────────────
  onSave(): void {
    const fs = this.materiaalFormState;
    if (!fs.naam().valid()) {
      fs.naam().markAsTouched();
      return;
    }

    const customProps = this.materiaalFormCustomProperties();
    const customProperties: Record<string, string> = {};
    for (const [key, value] of Object.entries(customProps)) {
      if (value && value.trim()) customProperties[key] = value.trim();
    }

    this.saving.set(true);

    const model = this.formModel();
    const dto = {
      materiaalTypeId: this.materiaalTypeId(),
      naam: model.naam.trim(),
      serienummer: (model.serienummer ?? '').trim() || null,
      aankoopDatum: model.aankoopDatum || null,
      notities: (model.notities ?? '').trim() || null,
      customProperties: Object.keys(customProperties).length > 0 ? customProperties : null,
    };

    const existing = this.materiaal();
    const req$ = existing
      ? this.materiaalService.updateMateriaal(this.materiaalTypeId(), existing.id, dto)
      : this.materiaalService.createMateriaal(dto);

    req$.subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.success(existing ? 'Materiaal bijgewerkt.' : 'Materiaal toegevoegd.');
        this.saved.emit();
      },
      error: () => {
        this.saving.set(false);
        this.toast.error('Opslaan mislukt. Probeer opnieuw.');
      }
    });
  }
}