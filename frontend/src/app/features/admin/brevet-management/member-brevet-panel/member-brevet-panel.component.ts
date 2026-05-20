import { Component, input, inject, signal, computed, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { forkJoin, from, of } from 'rxjs';
import { BrevetManagementService, CreateBrevetRequest } from '../brevet-management.service';
import { MemberOrganisatieService, CreateMemberOrganisatieRequest, UpdateMemberOrganisatieRequest, MemberOrganisatie } from '../member-organisatie.service';
import { LookupTypeDoc } from '../../lookup-type-management/lookup-type-management.component';
import { call } from '../../../../core/firebase/callable';
import { ToastService } from '../../../../shared/components/toast/toast.service';
import { SpinnerComponent } from '../../../../shared/components/spinner/spinner.component';
import { LocaleDatePipe } from '../../../../shared/pipes/locale-date.pipe';
import { BrevetDoc as Brevet } from '../../../profile/brevet.service';
import {
  ORGANISATIES_MET_LOGBOEK, Organisatie,
  OrganisatieMetLogboek
} from '../../../../../generated/api-schemas';

/** One row in the checkbox list — one BrevetTypeDef mapped to its current state */
interface BrevetCheckboxRow {
  /** The brevet type definition */
  def: LookupTypeDoc;
  /** Whether this brevet type is currently selected (has a Brevet record) */
  checked: boolean;
  /** The behaaldDatum of the existing Brevet (if any), or '' */
  behaaldDatum: string;
  /** The id of the existing Brevet record (null if not yet saved) */
  existingId: string | null;
}

/** Groups checkbox rows per organisatie */
interface OrgBrevetGroup {
  organisatie: string;
  rows: BrevetCheckboxRow[];
  isExpanded: ReturnType<typeof signal<boolean>>;
}

@Component({
  selector: 'app-member-brevet-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, SpinnerComponent, LocaleDatePipe],
  templateUrl: './member-brevet-panel.component.html',
})
export class MemberBrevetPanelComponent {
  readonly memberId = input.required<string>();
  /** Accepts both `readonly` and `readonlyInput` binding names */
  readonly readonlyInput = input(false, { alias: 'readonly' });

  private readonly brevetService = inject(BrevetManagementService);
  private readonly organisatieService = inject(MemberOrganisatieService);
  private readonly toast = inject(ToastService);

  // ── Brevetten (checkbox state) ────────────────────────────────────────────
  readonly brevLoading = signal(false);
  readonly brevetten = signal<Brevet[]>([]);
  readonly brevetToDelete = signal<Brevet | null>(null);

  readonly brevetTypeDefs = signal<LookupTypeDoc[]>([]);
  readonly brevetTypeDefsLoading = signal(false);

  /** Grouped checkbox rows, one group per organisatie */
  readonly checkboxGroups = signal<OrgBrevetGroup[]>([]);

  readonly checkboxSaving = signal(false);

  // ── Organisaties list ─────────────────────────────────────────────────────
  readonly orgLoading = signal(false);
  readonly organisaties = signal<MemberOrganisatie[]>([]);
  readonly orgToDelete = signal<MemberOrganisatie | null>(null);

  readonly availableOrgsForAdd = computed<OrganisatieMetLogboek[]>(() => {
    const linked = new Set(this.organisaties().map(o => o.organisatie));
    return [...ORGANISATIES_MET_LOGBOEK].filter(o => !linked.has(o));
  });

  // ── Organisatie form state ────────────────────────────────────────────────
  readonly showOrgForm = signal(false);
  readonly editOrg = signal<MemberOrganisatie | null>(null);
  readonly orgSaving = signal(false);
  readonly orgFormError = signal<string | null>(null);

  orgForm: {
    organisatie: string;
    logboeknummer: string;
    beginDatum: string;
  } = this.emptyOrgForm();

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  constructor() {
    // Reload when memberId changes
    effect(() => {
      const id = this.memberId();
      if (id) {
        this.loadBrevetTypeDefs();
        this.loadBrevetten(id);
        this.loadOrganisaties(id);
      }
    });
  }

  // ── BrevetTypeDefs loading ────────────────────────────────────────────────

  private loadBrevetTypeDefs(): void {
    this.brevetTypeDefsLoading.set(true);
    from(call<void, LookupTypeDoc[]>('getBrevetTypes')).subscribe({
      next: list => {
        this.brevetTypeDefs.set(list);
        this.brevetTypeDefsLoading.set(false);
        this.buildCheckboxGroups();
      },
      error: () => {
        this.brevetTypeDefsLoading.set(false);
        this.toast.error('Kon brevet types niet laden.');
      }
    });
  }

  // ── Brevetten loading ─────────────────────────────────────────────────────

  private loadBrevetten(memberId: string): void {
    this.brevLoading.set(true);
    this.brevetService.getByMember(memberId).subscribe({
      next: list => {
        this.brevetten.set(list);
        this.brevLoading.set(false);
        this.buildCheckboxGroups();
      },
      error: () => { this.brevLoading.set(false); this.toast.error('Kon brevetten niet laden.'); }
    });
  }

  // ── Checkbox group builder ────────────────────────────────────────────────

  private buildCheckboxGroups(): void {
    const defs = this.brevetTypeDefs();
    const brevetten = this.brevetten();

    if (defs.length === 0) return; // wait until defs are loaded

    // Match logic: brevet.organisatie + brevet.niveau === def.organisatie + def.naam
    // Only consider brevetten with brevetType === 'Brevet' (not Specialiteit)
    const brevetBrevetten = brevetten.filter(b => b.brevetType === 'Brevet');

    // Group defs by organisatie, preserving volgorde sort
    const orgMap = new Map<string, BrevetCheckboxRow[]>();
    for (const def of [...defs].sort((a, b) => a.volgorde - b.volgorde)) {
      const match = brevetBrevetten.find(
        b => b.organisatie === def.organisatie && b.niveau === def.naam
      );

      const row: BrevetCheckboxRow = {
        def,
        checked: !!match,
        behaaldDatum: match?.behaaldDatum ?? '',
        existingId: match?.id ?? null,
      };

      if (!orgMap.has(def.organisatie)) {
        orgMap.set(def.organisatie, []);
      }
      orgMap.get(def.organisatie)!.push(row);
    }

    // Preserve expansion state if groups already exist
    const existingGroups = this.checkboxGroups();
    const existingExpansion = new Map<string, boolean>(
      existingGroups.map(g => [g.organisatie, g.isExpanded()])
    );

    const groups: OrgBrevetGroup[] = [];
    for (const [org, rows] of orgMap.entries()) {
      groups.push({
        organisatie: org,
        rows,
        isExpanded: signal(existingExpansion.get(org) ?? true),
      });
    }

    this.checkboxGroups.set(groups);
  }

  // ── Checkbox interactions ─────────────────────────────────────────────────

  toggleBrevetType(row: BrevetCheckboxRow): void {
    row.checked = !row.checked;
    if (!row.checked) {
      row.behaaldDatum = '';
    }
    // Trigger change detection by rebuilding the signal value
    this.checkboxGroups.update(groups => [...groups]);
  }

  onDateChange(row: BrevetCheckboxRow, date: string): void {
    row.behaaldDatum = date;
    this.checkboxGroups.update(groups => [...groups]);
  }

  toggleOrgGroup(group: OrgBrevetGroup): void {
    group.isExpanded.update(v => !v);
  }

  // ── Save brevetten (diff-based) ───────────────────────────────────────────

  saveBrevetten(): void {
    const memberId = this.memberId();
    const groups = this.checkboxGroups();
    const currentBrevetten = this.brevetten();

    const toCreate: CreateBrevetRequest[] = [];
    const toDelete: string[] = [];        // existing brevet ids to delete
    const toUpdate: { id: string; dto: CreateBrevetRequest }[] = [];

    for (const group of groups) {
      for (const row of group.rows) {
        if (row.checked && row.existingId === null) {
          // New: needs to be created
          toCreate.push({
            organisatie: row.def.organisatie as Organisatie,
            organisatieNaam: null,
            niveau: row.def.naam,
            brevetType: 'Brevet',
            behaaldDatum: row.behaaldDatum || null,
            notities: null,
          });
        } else if (row.checked && row.existingId !== null) {
          // Existing: check if date changed
          const existing = currentBrevetten.find(b => b.id === row.existingId);
          const existingDate = existing?.behaaldDatum ?? '';
          if ((row.behaaldDatum || '') !== (existingDate || '')) {
            toUpdate.push({
              id: row.existingId,
              dto: {
                organisatie: row.def.organisatie as Organisatie,
                organisatieNaam: null,
                niveau: row.def.naam,
                brevetType: 'Brevet',
                behaaldDatum: row.behaaldDatum || null,
                notities: existing?.notities ?? null,
              }
            });
          }
        } else if (!row.checked && row.existingId !== null) {
          // Unchecked: needs to be deleted
          toDelete.push(row.existingId);
        }
      }
    }

    if (toCreate.length === 0 && toDelete.length === 0 && toUpdate.length === 0) {
      this.toast.success('Geen wijzigingen.');
      return;
    }

    this.checkboxSaving.set(true);

    const creates$ = toCreate.map(dto => this.brevetService.create(memberId, dto));
    const deletes$ = toDelete.map(id => this.brevetService.delete(memberId, id));
    const updates$ = toUpdate.map(({ id, dto }) => this.brevetService.update(memberId, id, dto));

    forkJoin([...creates$, ...deletes$, ...updates$, of(null)]).subscribe({
      next: () => {
        this.checkboxSaving.set(false);
        this.loadBrevetten(memberId);
        this.loadOrganisaties(memberId);
        this.toast.success('Brevetten opgeslagen.');
      },
      error: () => {
        this.checkboxSaving.set(false);
        this.toast.error('Opslaan mislukt. Probeer opnieuw.');
      }
    });
  }

  // ── Brevet delete (for the existing delete confirm dialog) ────────────────

  confirmDelete(brevet: Brevet): void {
    this.brevetToDelete.set(brevet);
  }

  onDeleteConfirmed(): void {
    const brevet = this.brevetToDelete();
    if (!brevet) return;

    this.brevetService.delete(this.memberId(), brevet.id).subscribe({
      next: () => {
        this.brevetToDelete.set(null);
        this.loadBrevetten(this.memberId());
        this.loadOrganisaties(this.memberId());
        this.toast.success('Brevet verwijderd.');
      },
      error: () => this.toast.error('Verwijderen mislukt.')
    });
  }

  // ── Organisaties CRUD ─────────────────────────────────────────────────────

  private loadOrganisaties(memberId: string): void {
    this.orgLoading.set(true);
    this.organisatieService.getByMember(memberId).subscribe({
      next: list => { this.organisaties.set(list); this.orgLoading.set(false); },
      error: () => { this.orgLoading.set(false); this.toast.error('Kon organisatiekoppelingen niet laden.'); }
    });
  }

  openOrgForm(org: MemberOrganisatie | null = null): void {
    this.editOrg.set(org);
    this.orgFormError.set(null);
    if (org) {
      this.orgForm = {
        organisatie: org.organisatie,
        logboeknummer: org.logboeknummer ?? '',
        beginDatum: org.beginDatum ?? '',
      };
    } else {
      this.orgForm = this.emptyOrgForm();
    }
    this.showOrgForm.set(true);
  }

  closeOrgForm(): void {
    this.showOrgForm.set(false);
    this.editOrg.set(null);
  }

  saveOrg(): void {
    if (!this.orgForm.organisatie) { this.orgFormError.set('Organisatie is verplicht.'); return; }

    this.orgFormError.set(null);
    this.orgSaving.set(true);

    const existing = this.editOrg();

    if (existing) {
      const dto: UpdateMemberOrganisatieRequest = {
        logboeknummer: this.orgForm.logboeknummer || null,
        beginDatum: this.orgForm.beginDatum || null,
      };
      this.organisatieService.update(this.memberId(), existing.id, dto).subscribe({
        next: () => {
          this.orgSaving.set(false);
          this.closeOrgForm();
          this.loadOrganisaties(this.memberId());
          this.toast.success('Organisatiekoppeling bijgewerkt.');
        },
        error: () => {
          this.orgSaving.set(false);
          this.orgFormError.set('Opslaan mislukt. Probeer opnieuw.');
        }
      });
    } else {
      const dto: CreateMemberOrganisatieRequest = {
        organisatie: this.orgForm.organisatie as OrganisatieMetLogboek,
        logboeknummer: this.orgForm.logboeknummer || null,
        beginDatum: this.orgForm.beginDatum || null,
      };
      this.organisatieService.create(this.memberId(), dto).subscribe({
        next: () => {
          this.orgSaving.set(false);
          this.closeOrgForm();
          this.loadOrganisaties(this.memberId());
          this.toast.success('Organisatiekoppeling toegevoegd.');
        },
        error: (err) => {
          this.orgSaving.set(false);
          const msg = err?.status === 409
            ? 'Deze organisatie is al gekoppeld voor dit lid.'
            : 'Opslaan mislukt. Probeer opnieuw.';
          this.orgFormError.set(msg);
        }
      });
    }
  }

  confirmOrgDelete(org: MemberOrganisatie): void {
    this.orgToDelete.set(org);
  }

  onOrgDeleteConfirmed(): void {
    const org = this.orgToDelete();
    if (!org) return;

    this.organisatieService.delete(this.memberId(), org.id).subscribe({
      next: () => {
        this.orgToDelete.set(null);
        this.loadOrganisaties(this.memberId());
        this.toast.success('Organisatiekoppeling verwijderd.');
      },
      error: () => this.toast.error('Verwijderen mislukt.')
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private emptyOrgForm() {
    return {
      organisatie: '',
      logboeknummer: '',
      beginDatum: '',
    };
  }
}
