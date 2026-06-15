import {
  Component,
  input,
  output,
  inject,
  signal,
  computed,
  effect,
  ChangeDetectionStrategy,
} from '@angular/core';
import {
  ButtonComponent,
  FormFieldComponent,
  InputComponent,
  SidePanelComponent,
  TextareaComponent,
} from '../../../shared/components/design-system';
import { LucideX } from '../../../shared/lucide-icons';
import { FieldTree, form } from '@angular/forms/signals';
import { CustomPropertyDef, MateriaalTypeWithMaterialen } from '../../../../generated/api-schemas';
import { materiaalTypeFormSchema, type MateriaalTypeForm } from '../../../shared/form-schemas';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { MateriaalService } from './materiaal.service';

@Component({
  selector: 'app-materiaal-type-form',
  standalone: true,
  imports: [
    SidePanelComponent,
    ButtonComponent,
    FormFieldComponent,
    InputComponent,
    TextareaComponent,
    LucideX,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './materiaal-type-form.component.html',
})
export class MateriaalTypeFormComponent {
  private readonly materiaalService = inject(MateriaalService);
  private readonly toast = inject(ToastService);

  // ── Inputs ──────────────────────────────────────────────────────────────
  /** The type being edited, or null for create mode */
  readonly type = input<MateriaalTypeWithMaterialen | null>(null);

  // ── Outputs ───────────────────────────────────────────────────────────
  readonly saved = output<void>();
  readonly cancelled = output<void>();

  // ── State ────────────────────────────────────────────────────────────
  readonly saving = signal(false);

  // Signal form for type form fields — initialized in constructor (requires injection context)
  readonly formModel = signal<MateriaalTypeForm>({
    naam: '',
    beschrijving: '',
    volgorde: 0,
    maxLeningenPerLid: null,
    huurprijs: null,
    borg: null,
  });
  readonly typeFormState: FieldTree<MateriaalTypeForm>;

  readonly customProperties = signal<{ id: string; key: string; label: string }[]>([]);

  // ── Computed helpers ──────────────────────────────────────────────────
  readonly editingType = computed(() => this.type());

  readonly naam = computed(() => this.formModel().naam);
  setNaam(v: string): void {
    this.formModel.update((m) => ({ ...m, naam: v }));
  }

  get beschrijving(): string {
    return this.formModel().beschrijving ?? '';
  }
  set beschrijving(v: string) {
    this.formModel.update((m) => ({ ...m, beschrijving: v }));
  }

  readonly volgordeAsString = computed(() => String(this.formModel().volgorde ?? 0));
  onVolgordeInput(value: string): void {
    this.formModel.update((m) => ({ ...m, volgorde: Number(value) || 0 }));
  }

  readonly maxLeningenAsString = computed(() => {
    const v = this.formModel().maxLeningenPerLid;
    return v !== null && v !== undefined ? String(v) : '';
  });
  onMaxLeningenInput(value: string): void {
    const n = value ? Number(value) : null;
    this.formModel.update((m) => ({ ...m, maxLeningenPerLid: n }));
  }

  readonly huurprijsAsString = computed(() => {
    const v = this.formModel().huurprijs;
    return v !== null && v !== undefined ? String(v) : '';
  });
  onHuurprijsInput(value: string): void {
    const n = value ? Number(value) : null;
    this.formModel.update((m) => ({ ...m, huurprijs: n }));
  }

  readonly borgAsString = computed(() => {
    const v = this.formModel().borg;
    return v !== null && v !== undefined ? String(v) : '';
  });
  onBorgInput(value: string): void {
    const n = value ? Number(value) : null;
    this.formModel.update((m) => ({ ...m, borg: n }));
  }

  protected firstError(field: { errors(): readonly { message?: string }[] }): string {
    const errs = field.errors();
    return errs.length > 0 ? errs[0].message ?? '' : '';
  }

  // ── Custom property management ────────────────────────────────────────
  addCustomProperty(): void {
    this.customProperties.update((props) => [
      ...props,
      { id: crypto.randomUUID(), key: '', label: '' },
    ]);
  }

  removeCustomProperty(index: number): void {
    this.customProperties.update((props) => props.filter((_, i) => i !== index));
  }

  updatePropKey(index: number, value: string): void {
    this.customProperties.update((props) => {
      const updated = [...props];
      updated[index] = { ...updated[index], key: value };
      return updated;
    });
  }

  updatePropLabel(index: number, value: string): void {
    this.customProperties.update((props) => {
      const updated = [...props];
      updated[index] = { ...updated[index], label: value };
      return updated;
    });
  }

  // ── Lifecycle ────────────────────────────────────────────────────────
  constructor() {
    // form() calls inject() internally — must be called in injection context (constructor)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.typeFormState = form<MateriaalTypeForm>(this.formModel, materiaalTypeFormSchema as any);

    // Watch input and populate form when type changes
    effect(
      () => {
        const t = this.type();
        this.formModel.set({
          naam: t?.naam ?? '',
          beschrijving: t?.beschrijving ?? '',
          volgorde: t?.volgorde ?? 0,
          maxLeningenPerLid: t?.maxLeningenPerLid ?? null,
          huurprijs: t?.huurprijs ?? null,
          borg: t?.borg ?? null,
        });
        this.customProperties.set(
          (t?.customProperties ?? []).map((p: CustomPropertyDef) => ({
            id: crypto.randomUUID(),
            key: p.key,
            label: p.label,
          }))
        );
      },
      { }
    );
  }

  // ── Save ────────────────────────────────────────────────────────────
  onSave(): void {
    const fs = this.typeFormState;
    if (!fs.naam().valid()) {
      fs.naam().markAsTouched();
      return;
    }

    const keys = this.customProperties()
      .map((p) => p.key.trim())
      .filter((k) => k.length > 0);
    if (new Set(keys).size !== keys.length) {
      this.toast.error('Elk veld moet een unieke veldnaam hebben.');
      return;
    }

    const customProperties: CustomPropertyDef[] = this.customProperties()
      .filter((p) => p.key.trim() && p.label.trim())
      .map((p) => ({ key: p.key.trim(), label: p.label.trim() }));

    const model = this.formModel();
    const dto = {
      naam: model.naam.trim(),
      beschrijving: (model.beschrijving ?? '').trim() || null,
      volgorde: model.volgorde ?? 0,
      maxLeningenPerLid: model.maxLeningenPerLid ?? null,
      huurprijs: model.huurprijs ?? null,
      borg: model.borg ?? null,
      customProperties: customProperties.length > 0 ? customProperties : null,
    };

    const existing = this.type();
    this.saving.set(true);

    const req$ = existing
      ? this.materiaalService.updateType(existing.id, dto)
      : this.materiaalService.createType(dto);

    req$.subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.success(existing ? 'Type bijgewerkt.' : 'Type toegevoegd.');
        this.saved.emit();
      },
      error: () => {
        this.saving.set(false);
        this.toast.error('Opslaan mislukt. Probeer opnieuw.');
      },
    });
  }
}
