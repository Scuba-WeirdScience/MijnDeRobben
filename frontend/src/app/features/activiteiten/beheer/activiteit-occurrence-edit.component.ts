import { Component, input, output, inject, signal, effect } from '@angular/core';
import { FieldTree, form } from '@angular/forms/signals';
import {
  SidePanelComponent,
  ButtonComponent,
  FormFieldComponent,
  InputComponent,
  SelectComponent,
  TextareaComponent,
  RichTextEditorComponent,
} from '../../../shared/components/design-system';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { ActiviteitenService, ResolvedOccurrence, LocatieDoc } from '../activiteiten.service';
import { occurrenceEditFormSchema, type OccurrenceEditForm } from '../../../shared/form-schemas';

// Tailwind safelist — do NOT remove
const _TW_SAFELIST = [
  'focus:outline-none', 'focus:ring-2', 'focus:ring-scuba-500',
  'focus:border-transparent',
];

@Component({
  selector: 'app-activiteit-occurrence-edit',
  standalone: true,
  imports: [
    SidePanelComponent,
    ButtonComponent,
    FormFieldComponent,
    InputComponent,
    SelectComponent,
    TextareaComponent,
    RichTextEditorComponent,
  ],
  templateUrl: './activiteit-occurrence-edit.component.html',
})
export class ActiviteitOccurrenceEditComponent {
  private readonly service = inject(ActiviteitenService);
  private readonly toast = inject(ToastService);

  readonly occurrence = input.required<ResolvedOccurrence>();
  readonly locaties = input.required<LocatieDoc[]>();
  readonly saved = output<void>();
  readonly cancelled = output<void>();

  readonly saving = signal(false);
  readonly locatieType = signal<'selecteer' | 'vrij'>('selecteer');

  readonly formModel = signal<OccurrenceEditForm>({
    titel: '',
    startDatumTijd: '',
    eindDatumTijd: '',
    locatieId: null,
    locatieVrij: null,
    beschrijving: null,
    bannerUrl: null,
    maxDeelnemers: null,
    notitie: null,
  });

  readonly formState: FieldTree<OccurrenceEditForm>;

  constructor() {
    this.formState = form<OccurrenceEditForm>(this.formModel, occurrenceEditFormSchema as any);

    effect(() => {
      const occ = this.occurrence();
      this.formModel.set({
        titel:          occ.titel,
        startDatumTijd: occ.startDatumTijd.substring(0, 16),
        eindDatumTijd:  occ.eindDatumTijd.substring(0, 16),
        locatieId:      occ.locatieId,
        locatieVrij:    occ.locatieVrij,
        beschrijving:   occ.beschrijving,
        bannerUrl:      occ.bannerUrl,
        maxDeelnemers:  occ.maxDeelnemers,
        notitie:        null,
      });
      this.locatieType.set(occ.locatieVrij ? 'vrij' : 'selecteer');
    }, { allowSignalWrites: true });
  }

  protected firstError(field: { errors(): readonly { message?: string }[] }): string {
    const errs = field.errors();
    return errs.length > 0 ? (errs[0].message ?? '') : '';
  }

  numToStr(v: number | null | undefined): string {
    return v != null ? String(v) : '';
  }

  onBeschrijvingChange(value: string): void {
    this.formModel.update(m => ({ ...m, beschrijving: value || null }));
  }

  onSave(): void {
    const fs = this.formState;
    if (!fs.titel().valid() || !fs.startDatumTijd().valid() || !fs.eindDatumTijd().valid()) {
      fs.titel().markAsTouched();
      fs.startDatumTijd().markAsTouched();
      fs.eindDatumTijd().markAsTouched();
      return;
    }

    const occ   = this.occurrence();
    const model = this.formModel();

    this.saving.set(true);
    this.service.updateActiviteit({
      id:              occ.activiteitId,
      scope:           'single',
      occurrenceDatum: occ.occurrenceDatum,
      titel:           model.titel.trim(),
      startDatumTijd:  model.startDatumTijd,
      eindDatumTijd:   model.eindDatumTijd,
      locatieId:       this.locatieType() === 'selecteer' ? (model.locatieId ?? null) : null,
      locatieNaam:     this.locatieType() === 'selecteer' && model.locatieId
                         ? (this.locaties().find(l => l.id === model.locatieId)?.naam ?? null)
                         : null,
      locatieVrij:     this.locatieType() === 'vrij' ? (model.locatieVrij?.trim() || null) : null,
      beschrijving:    model.beschrijving?.trim() || null,
      bannerUrl:       model.bannerUrl?.trim() || null,
      maxDeelnemers:   model.maxDeelnemers ?? null,
    }).subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.success('Exemplaar bijgewerkt.');
        this.saved.emit();
      },
      error: () => {
        this.saving.set(false);
        this.toast.error('Opslaan mislukt. Probeer opnieuw.');
      },
    });
  }
}
