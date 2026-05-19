import {
  Component, input, output, inject, signal, computed, effect,
} from '@angular/core';
import { NgClass } from '@angular/common';
import { FieldTree, form } from '@angular/forms/signals';
import {
  ButtonComponent,
  FormFieldComponent,
  InputComponent,
  SelectComponent,
  RichTextEditorComponent,
} from '../../../shared/components/design-system';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { ActiviteitenService, ActiviteitDoc, LocatieDoc, RecurrenceRule } from '../activiteiten.service';
import { GroepenService, Groep } from '../../berichten/services/groepen.service';
import { ThreadsService, Thread } from '../../berichten/services/threads.service';
import { MemberService, Member } from '../../members/services/member.service';
import { activiteitFormSchema, type ActiviteitForm } from '../../../shared/form-schemas';
import { ActiviteitRecurrenceFormComponent } from './activiteit-recurrence-form.component';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { firestore } from '@fire';

// Tailwind safelist — do NOT remove
const _TW_SAFELIST = [
  'bg-scuba-600', 'hover:bg-scuba-700', 'dark:bg-scuba-500',
  'bg-gray-200', 'dark:bg-gray-700',
];

export interface GroepMetThreads {
  groep: Groep;
  threads: Thread[];
  open: boolean;
}

@Component({
  selector: 'app-activiteit-form',
  standalone: true,
  imports: [
    NgClass,
    ButtonComponent,
    FormFieldComponent,
    InputComponent,
    SelectComponent,
    RichTextEditorComponent,
    ActiviteitRecurrenceFormComponent,
  ],
  templateUrl: './activiteit-form.component.html',
})
export class ActiviteitFormComponent {
  private readonly service = inject(ActiviteitenService);
  private readonly groepenService = inject(GroepenService);
  private readonly threadsService = inject(ThreadsService);
  private readonly members = inject(MemberService);
  private readonly toast = inject(ToastService);

  readonly activiteit = input<ActiviteitDoc | null>(null);
  readonly locaties = input.required<LocatieDoc[]>();
  readonly saved = output<void>();
  readonly cancelled = output<void>();

  readonly saving = signal(false);
  readonly showInschrijvingen = signal(false);
  readonly showHerhaling = signal(false);
  readonly locatieType = signal<'selecteer' | 'vrij'>('selecteer');

  // ── Organisator ─────────────────────────────────────────────────────────────
  readonly ledenZoekterm = signal('');
  readonly ledenZoekResultaten = signal<Member[]>([]);
  readonly ledenZoekenBezig = signal(false);
  readonly geselecteerdeOrganisatorLeden = signal<Member[]>([]);
  private ledenZoekTimeout: ReturnType<typeof setTimeout> | null = null;

  readonly alleGroepen = computed(() => this.groepenService.allGroepen());

  // ── Gesprek (discussie) ──────────────────────────────────────────────────────
  readonly groepenMetThreads = signal<GroepMetThreads[]>([]);
  readonly gesprekLaden = signal(false);
  readonly nieuweThreadModus = signal(false);
  // groepId voor nieuwe thread (apart van gekoppelde groepId)
  readonly nieuweThreadGroepId = signal<string>('');

  readonly formModel = signal<ActiviteitForm>({
    titel: '',
    startDatumTijd: '',
    eindDatumTijd: '',
    locatieId: null,
    locatieVrij: null,
    beschrijving: '',
    inschrijvingenActief: false,
    isPubliek: false,
    maxDeelnemers: null,
    registratiesZichtbaar: 'iedereen',
    gasten: false,
    maxGastenPerInschrijving: null,
    gastKosten: null,
    lidKosten: null,
    organisatorId: null,
    organisatorLeden: [],
    organisatorGroepId: null,
    bannerUrl: null,
    threadId: null,
    groepId: null,
    nieuweThreadTitel: null,
    nieuweThreadBericht: null,
  });

  readonly formState: FieldTree<ActiviteitForm>;
  readonly recurrenceRule = signal<RecurrenceRule | null>(null);

  /** Snapshot taken each time the activiteit input changes — used for dirty detection. */
  private readonly cleanModel = signal<ActiviteitForm>({ ...this.formModel() });

  /** True when the user has changed anything since the form was last loaded. */
  readonly isDirty = computed(() => {
    const c = this.cleanModel();
    const m = this.formModel();
    return JSON.stringify(c) !== JSON.stringify(m);
  });

  /** Guard passed to <app-side-panel>: shows a Dutch confirm dialog when dirty. */
  readonly canCloseGuard = (): boolean => {
    if (!this.isDirty()) return true;
    return window.confirm('Je hebt niet-opgeslagen wijzigingen. Wil je het formulier sluiten?');
  };

  // Computed: welke thread is geselecteerd (voor highlight)
  readonly geselecteerdeThreadId = computed(() => this.formModel().threadId);

  // Computed: geselecteerde thread-titel tonen in de header
  readonly geselecteerdeThreadTitel = computed(() => {
    const tid = this.formModel().threadId;
    if (!tid) return null;
    for (const g of this.groepenMetThreads()) {
      const t = g.threads.find(t => t.id === tid);
      if (t) return `${g.groep.name} › ${t.title}`;
    }
    return null;
  });

  protected firstError(field: { errors(): readonly { message?: string }[] }): string {
    const errs = field.errors();
    return errs.length > 0 ? (errs[0].message ?? '') : '';
  }

  numToStr(v: number | null | undefined): string {
    return v !== null && v !== undefined ? String(v) : '';
  }

  private toDatetimeLocal(iso: string): string {
    if (!iso) return '';
    return iso.substring(0, 16);
  }

  constructor() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.formState = form<ActiviteitForm>(this.formModel, activiteitFormSchema as any);

    // Laad alle threads voor alle groepen eenmalig
    this.laadAlleThreads();

    effect(() => {
      const a = this.activiteit();
      this.formModel.set({
        titel: a?.titel ?? '',
        startDatumTijd: this.toDatetimeLocal(a?.startDatumTijd ?? ''),
        eindDatumTijd: this.toDatetimeLocal(a?.eindDatumTijd ?? ''),
        locatieId: a?.locatieId ?? null,
        locatieVrij: a?.locatieVrij ?? null,
        beschrijving: a?.beschrijving ?? '',
        inschrijvingenActief: a?.inschrijvingenActief ?? false,
        isPubliek: a?.isPubliek ?? false,
        maxDeelnemers: a?.maxDeelnemers ?? null,
        registratiesZichtbaar: a?.registratiesZichtbaar ?? 'iedereen',
        gasten: a?.gasten ?? false,
        maxGastenPerInschrijving: a?.maxGastenPerInschrijving ?? null,
        gastKosten: a?.gastKosten ?? null,
        lidKosten: a?.lidKosten ?? null,
        organisatorId: a?.organisatorId ?? null,
        organisatorLeden: a?.organisatorLeden ?? [],
        organisatorGroepId: a?.organisatorGroepId ?? null,
        bannerUrl: a?.bannerUrl ?? null,
        threadId: a?.threadId ?? null,
        groepId: a?.groepId ?? null,
        nieuweThreadTitel: null,
        nieuweThreadBericht: null,
      });
      this.showInschrijvingen.set(a?.inschrijvingenActief ?? false);
      this.showHerhaling.set(a?.isHerhalend ?? false);
      this.recurrenceRule.set(a?.recurrenceRule ?? null);
      this.locatieType.set(a?.locatieVrij ? 'vrij' : 'selecteer');
      this.nieuweThreadModus.set(false);
      // Reset dirty tracking after form is loaded — use the same object we just set
      const snapshot: ActiviteitForm = {
        titel: a?.titel ?? '',
        startDatumTijd: this.toDatetimeLocal(a?.startDatumTijd ?? ''),
        eindDatumTijd: this.toDatetimeLocal(a?.eindDatumTijd ?? ''),
        locatieId: a?.locatieId ?? null,
        locatieVrij: a?.locatieVrij ?? null,
        beschrijving: a?.beschrijving ?? '',
        inschrijvingenActief: a?.inschrijvingenActief ?? false,
        isPubliek: a?.isPubliek ?? false,
        maxDeelnemers: a?.maxDeelnemers ?? null,
        registratiesZichtbaar: a?.registratiesZichtbaar ?? 'iedereen',
        gasten: a?.gasten ?? false,
        maxGastenPerInschrijving: a?.maxGastenPerInschrijving ?? null,
        gastKosten: a?.gastKosten ?? null,
        lidKosten: a?.lidKosten ?? null,
        organisatorId: a?.organisatorId ?? null,
        organisatorLeden: a?.organisatorLeden ?? [],
        organisatorGroepId: a?.organisatorGroepId ?? null,
        bannerUrl: a?.bannerUrl ?? null,
        threadId: a?.threadId ?? null,
        groepId: a?.groepId ?? null,
        nieuweThreadTitel: null,
        nieuweThreadBericht: null,
      };
      this.cleanModel.set(snapshot);

      // Open de groep van de gekoppelde thread automatisch
      if (a?.groepId) {
        this.groepenMetThreads.update(list =>
          list.map(g => g.groep.id === a.groepId ? { ...g, open: true } : g)
        );
      }

      // Herstel geselecteerde leden
      const leden = a?.organisatorLeden ?? [];
      this.geselecteerdeOrganisatorLeden.set([]);
      if (leden.length > 0) {
        leden.forEach(uid => {
          this.members.getById(uid).subscribe({
            next: m => {
              this.geselecteerdeOrganisatorLeden.update(prev => {
                if (prev.find(x => x.id === m.id)) return prev;
                return [...prev, m];
              });
            },
          });
        });
      }
    }, { allowSignalWrites: true });
  }

  // ── Gesprek: laad alle threads ───────────────────────────────────────────────

  private laadAlleThreads(): void {
    this.gesprekLaden.set(true);
    const groepen = this.groepenService.allGroepen();
    if (groepen.length === 0) {
      let attempts = 0;
      const interval = setInterval(() => {
        const g = this.groepenService.allGroepen();
        if (g.length > 0) {
          clearInterval(interval);
          this.laadThreadsVoorGroepen(g);
          return;
        }
        // Give up after ~3 seconds — user has no groepen or data not available
        if (++attempts >= 10) {
          clearInterval(interval);
          this.gesprekLaden.set(false);
        }
      }, 300);
      return;
    }
    this.laadThreadsVoorGroepen(groepen);
  }

  private laadThreadsVoorGroepen(groepen: Groep[]): void {
    this.gesprekLaden.set(true);
    const promises = groepen.map(groep => {
      const q = query(
        collection(firestore, 'groepen', groep.id, 'threads'),
        orderBy('title', 'asc')
      );
      return getDocs(q).then(snap => {
        const threads: Thread[] = snap.docs.map(d => {
          const data = d.data();
          return {
            id: d.id,
            groepId: groep.id,
            title: data['title'] ?? '',
            authorUid: data['authorUid'] ?? '',
            authorName: data['authorName'] ?? '',
            pinnedAt: data['pinnedAt'] ?? null,
            createdAt: data['createdAt'],
            updatedAt: data['updatedAt'],
            lastMessageAt: data['lastMessageAt'] ?? null,
            lastMessageBody: data['lastMessageBody'] ?? '',
            messageCount: data['messageCount'] ?? 0,
            unreadPerUser: data['unreadPerUser'] ?? {},
            threadSeenCount: data['threadSeenCount'] ?? 0,
            threadSeenByUids: data['threadSeenByUids'] ?? [],
          };
        });
        return { groep, threads, open: false } as GroepMetThreads;
      });
    });

    Promise.all(promises).then(result => {
      // Toon enkel groepen met threads
      this.groepenMetThreads.set(result.filter(g => g.threads.length > 0));
      this.gesprekLaden.set(false);
    }).catch(() => {
      this.gesprekLaden.set(false);
    });
  }

  selecteerThreadById(threadId: string): void {
    if (!threadId) {
      this.formModel.update(m => ({ ...m, threadId: null, groepId: null }));
      return;
    }
    for (const g of this.groepenMetThreads()) {
      const thread = g.threads.find(t => t.id === threadId);
      if (thread) {
        this.formModel.update(m => ({ ...m, threadId: thread.id, groepId: thread.groepId }));
        return;
      }
    }
  }

  selecteerThread(thread: Thread): void {
    const huidig = this.formModel().threadId;
    if (huidig === thread.id) {
      this.formModel.update(m => ({ ...m, threadId: null, groepId: null }));
    } else {
      this.formModel.update(m => ({ ...m, threadId: thread.id, groepId: thread.groepId }));
      this.nieuweThreadModus.set(false);
    }
  }

  toggleNieuweThread(): void {
    this.nieuweThreadModus.update(v => !v);
    if (this.nieuweThreadModus()) {
      // Wis eventuele bestaande selectie
      this.formModel.update(m => ({ ...m, threadId: null, groepId: null }));
      this.nieuweThreadGroepId.set('');
    } else {
      this.formModel.update(m => ({ ...m, nieuweThreadTitel: null, nieuweThreadBericht: null }));
    }
  }

  // ── Organisator leden ────────────────────────────────────────────────────────

  onLedenZoek(zoekterm: string): void {
    this.ledenZoekterm.set(zoekterm);
    if (this.ledenZoekTimeout) clearTimeout(this.ledenZoekTimeout);
    if (!zoekterm.trim()) {
      this.ledenZoekResultaten.set([]);
      return;
    }
    this.ledenZoekenBezig.set(true);
    this.ledenZoekTimeout = setTimeout(() => {
      this.members.getAll(1, 10, zoekterm).subscribe({
        next: r => {
          this.ledenZoekResultaten.set(r.items);
          this.ledenZoekenBezig.set(false);
        },
        error: () => this.ledenZoekenBezig.set(false),
      });
    }, 300);
  }

  voegLidToe(lid: Member): void {
    if (this.geselecteerdeOrganisatorLeden().find(l => l.id === lid.id)) return;
    this.geselecteerdeOrganisatorLeden.update(prev => [...prev, lid]);
    this.formModel.update(m => ({ ...m, organisatorLeden: [...(m.organisatorLeden ?? []), lid.userId] }));
    this.ledenZoekterm.set('');
    this.ledenZoekResultaten.set([]);
  }

  verwijderLid(lid: Member): void {
    this.geselecteerdeOrganisatorLeden.update(prev => prev.filter(l => l.id !== lid.id));
    this.formModel.update(m => ({ ...m, organisatorLeden: (m.organisatorLeden ?? []).filter(uid => uid !== lid.userId) }));
  }

  lidNaam(lid: Member): string {
    return `${lid.firstName} ${lid.lastName}`;
  }

  // ── Rest ─────────────────────────────────────────────────────────────────────

  onBeschrijvingChange(value: string): void {
    this.formModel.update(m => ({ ...m, beschrijving: value }));
  }

  toggleInschrijvingen(): void {
    const next = !this.showInschrijvingen();
    this.showInschrijvingen.set(next);
    this.formModel.update(m => ({ ...m, inschrijvingenActief: next }));
  }

  toggleHerhaling(): void {
    this.showHerhaling.set(!this.showHerhaling());
  }

  onRuleGewijzigd(rule: RecurrenceRule): void {
    this.recurrenceRule.set(rule);
  }

  // ── Opslaan ──────────────────────────────────────────────────────────────────

  onSave(): void {
    const fs = this.formState;
    if (!fs.titel().valid() || !fs.startDatumTijd().valid()) {
      fs.titel().markAsTouched();
      fs.startDatumTijd().markAsTouched();
      return;
    }

    const model = this.formModel();
    const existing = this.activiteit();

    if (this.nieuweThreadModus() && !model.nieuweThreadTitel?.trim()) {
      this.toast.error('Geef een titel op voor het nieuwe gesprek.');
      return;
    }
    if (this.nieuweThreadModus() && !this.nieuweThreadGroepId()) {
      this.toast.error('Kies een groep voor het nieuwe gesprek.');
      return;
    }

    this.saving.set(true);

    const doSave = (threadId: string | null, groepId: string | null) => {
      const dto = {
        titel: model.titel.trim(),
        startDatumTijd: model.startDatumTijd,
        eindDatumTijd: model.eindDatumTijd ?? '',
        locatieId: this.locatieType() === 'selecteer' ? (model.locatieId || null) : null,
        locatieNaam: this.locatieType() === 'selecteer' && model.locatieId
          ? (this.locaties().find(l => l.id === model.locatieId)?.naam ?? null)
          : null,
        locatieVrij: this.locatieType() === 'vrij' ? (model.locatieVrij?.trim() || null) : null,
        beschrijving: model.beschrijving?.trim() || null,
        inschrijvingenActief: model.inschrijvingenActief,
        isPubliek: model.isPubliek,
        maxDeelnemers: model.maxDeelnemers ?? null,
        registratiesZichtbaar: model.registratiesZichtbaar,
        gasten: model.gasten,
        maxGastenPerInschrijving: model.maxGastenPerInschrijving ?? null,
        gastKosten: model.gastKosten ?? null,
        lidKosten: model.lidKosten ?? null,
        organisatorId: null as string | null,
        organisatorNaam: null as string | null,
        organisatorLeden: model.organisatorLeden ?? [],
        organisatorGroepId: model.organisatorGroepId || null,
        bannerUrl: model.bannerUrl || null,
        threadId,
        groepId,
        isHerhalend: this.showHerhaling(),
        recurrenceRule: this.showHerhaling() ? this.recurrenceRule() : null,
      };

      const req$ = existing
        ? this.service.updateActiviteit({ id: existing.id, scope: 'all', ...dto })
        : this.service.createActiviteit(dto);

      req$.subscribe({
        next: () => {
          this.saving.set(false);
          this.cleanModel.set({ ...this.formModel() }); // mark clean so canClose guard won't fire
          this.toast.success(existing ? 'Activiteit bijgewerkt.' : 'Activiteit aangemaakt.');
          this.saved.emit();
        },
        error: () => {
          this.saving.set(false);
          this.toast.error('Opslaan mislukt. Probeer opnieuw.');
        },
      });
    };

    if (this.nieuweThreadModus() && model.nieuweThreadTitel?.trim()) {
      const groepId = this.nieuweThreadGroepId();
      this.threadsService.createThread(
        groepId,
        model.nieuweThreadTitel.trim(),
        model.nieuweThreadBericht?.trim() || ''
      ).then(result => {
        doSave(result.threadId, groepId);
      }).catch(() => {
        this.saving.set(false);
        this.toast.error('Gesprek aanmaken mislukt. Probeer opnieuw.');
      });
    } else {
      doSave(model.threadId || null, model.groepId || null);
    }
  }
}
