import {
  Component,
  input,
  output,
  inject,
  signal,
  effect,
  ChangeDetectionStrategy,
} from '@angular/core';
import { FieldTree, form } from '@angular/forms/signals';
import {
  SidePanelComponent,
  ButtonComponent,
  FormFieldComponent,
  InputComponent,
  TextareaComponent,
} from '../../../shared/components/design-system';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { ActiviteitenService, LocatieDoc } from '../activiteiten.service';
import { locatieFormSchema, type LocatieForm } from '../../../shared/form-schemas';

@Component({
  selector: 'app-locatie-form',
  standalone: true,
  imports: [
    SidePanelComponent,
    ButtonComponent,
    FormFieldComponent,
    InputComponent,
    TextareaComponent,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './locatie-form.component.html',
})
export class LocatieFormComponent {
  private readonly service = inject(ActiviteitenService);
  private readonly toast = inject(ToastService);

  readonly locatie = input<LocatieDoc | null>(null);
  readonly saved = output<void>();
  readonly cancelled = output<void>();

  readonly saving = signal(false);

  readonly formModel = signal<LocatieForm>({
    naam: '',
    adres: '',
    kaartLink: '',
    notities: '',
  });

  readonly formState: FieldTree<LocatieForm>;

  protected firstError(field: { errors(): readonly { message?: string }[] }): string {
    const errs = field.errors();
    return errs.length > 0 ? errs[0].message ?? '' : '';
  }

  constructor() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.formState = form<LocatieForm>(this.formModel, locatieFormSchema as any);

    effect(
      () => {
        const l = this.locatie();
        this.formModel.set({
          naam: l?.naam ?? '',
          adres: l?.adres ?? '',
          kaartLink: l?.kaartLink ?? '',
          notities: l?.notities ?? '',
        });
      },
      { }
    );
  }

  onSave(): void {
    if (!this.formState.naam().valid()) {
      this.formState.naam().markAsTouched();
      return;
    }

    const model = this.formModel();
    const dto = {
      naam: model.naam.trim(),
      adres: model.adres?.trim() || null,
      kaartLink: model.kaartLink?.trim() || null,
      notities: model.notities?.trim() || null,
    };

    const existing = this.locatie();
    this.saving.set(true);

    const req$ = existing
      ? this.service.updateLocatie(existing.id, dto)
      : this.service.createLocatie(dto);

    req$.subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.success(existing ? 'Locatie bijgewerkt.' : 'Locatie aangemaakt.');
        this.saved.emit();
      },
      error: () => {
        this.saving.set(false);
        this.toast.error('Opslaan mislukt. Probeer opnieuw.');
      },
    });
  }
}
