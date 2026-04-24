import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MateriaalService } from './materiaal.service';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { SpinnerComponent, ButtonComponent, ConfirmDialogComponent, EmptyStateComponent, BadgeComponent } from '../../../shared/components/design-system';
import {
  MateriaalTypeWithMaterialen,
  Materiaal,
  CustomPropertyDef,
} from '../../../../generated/api-schemas';
import * as QRCode from 'qrcode';
import { MateriaalTypeFormComponent } from './materiaal-type-form.component';
import { MateriaalItemFormComponent } from './materiaal-item-form.component';

@Component({
  selector: 'app-materiaal-beheer',
  standalone: true,
  imports: [CommonModule, SpinnerComponent, ButtonComponent, ConfirmDialogComponent, EmptyStateComponent, BadgeComponent, MateriaalTypeFormComponent, MateriaalItemFormComponent],
  templateUrl: './materiaal-beheer.component.html',
})
export class MateriaalBeheerComponent implements OnInit {
  private readonly materiaalService = inject(MateriaalService);
  private readonly toast = inject(ToastService);

  // ── State ────────────────────────────────────────────────────────────────
  readonly loading = signal(false);
  readonly types = signal<MateriaalTypeWithMaterialen[]>([]);
  readonly selectedType = signal<MateriaalTypeWithMaterialen | null>(null);

  // ── Type form ───────────────────────────────────────────────────────────
  readonly showTypeForm = signal(false);
  readonly editingType = signal<MateriaalTypeWithMaterialen | null>(null);
  readonly typeToDelete = signal<MateriaalTypeWithMaterialen | null>(null);

  // ── Materiaal form ──────────────────────────────────────────────────────
  readonly showMateriaalForm = signal(false);
  readonly editingMateriaal = signal<Materiaal | null>(null);
  readonly materiaalToDelete = signal<Materiaal | null>(null);

  // ── Lifecycle ───────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.loadAll();
  }

  private loadAll(): void {
    this.loading.set(true);
    this.materiaalService.getAllWithMaterialen().subscribe({
      next: list => {
        this.types.set(list);
        const current = this.selectedType();
        if (current) {
          const refreshed = list.find(t => t.id === current.id) ?? null;
          this.selectedType.set(refreshed);
        }
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.error('Kon materiaalgegevens niet laden.');
      }
    });
  }

  // ── Type selection ─────────────────────────────────────────────────────
  selectType(type: MateriaalTypeWithMaterialen): void {
    this.selectedType.set(type);
  }

  // ── Type form ───────────────────────────────────────────────────────────
  openTypeForm(type: MateriaalTypeWithMaterialen | null): void {
    this.editingType.set(type);
    this.showTypeForm.set(true);
  }

  closeTypeForm(): void {
    this.showTypeForm.set(false);
    this.editingType.set(null);
  }

  onTypeSaved(): void {
    this.closeTypeForm();
    this.loadAll();
    this.toast.success('Type bijgewerkt.');
  }

  confirmDeleteType(type: MateriaalTypeWithMaterialen): void {
    this.typeToDelete.set(type);
  }

  deleteTypeConfirmed(): void {
    const type = this.typeToDelete();
    if (!type) return;
    this.materiaalService.deleteType(type.id).subscribe({
      next: () => {
        this.typeToDelete.set(null);
        if (this.selectedType()?.id === type.id) this.selectedType.set(null);
        this.loadAll();
        this.toast.success('Type verwijderd.');
      },
      error: () => this.toast.error('Verwijderen mislukt.')
    });
  }

  // ── Materiaal form ──────────────────────────────────────────────────────
  openMateriaalForm(materiaal: Materiaal | null): void {
    this.editingMateriaal.set(materiaal);
    this.showMateriaalForm.set(true);
  }

  closeMateriaalForm(): void {
    this.showMateriaalForm.set(false);
    this.editingMateriaal.set(null);
  }

  onMateriaalSaved(): void {
    this.closeMateriaalForm();
    this.loadAll();
    this.toast.success('Materiaal bijgewerkt.');
  }

  confirmDeleteMateriaal(materiaal: Materiaal): void {
    this.materiaalToDelete.set(materiaal);
  }

  deleteMateriaalConfirmed(): void {
    const materiaal = this.materiaalToDelete();
    const type = this.selectedType();
    if (!materiaal || !type) return;
    this.materiaalService.deleteMateriaal(type.id, materiaal.id).subscribe({
      next: () => {
        this.materiaalToDelete.set(null);
        this.loadAll();
        this.toast.success('Materiaal verwijderd.');
      },
      error: () => this.toast.error('Verwijderen mislukt.')
    });
  }

  // ── Helpers ─────────────────────────────────────────────────────────────

  async printLabel(m: Materiaal): Promise<void> {
    const url = `${window.location.origin}/lening/${m.id}`;
    const dataUrl = await QRCode.toDataURL(url, { width: 200, margin: 2 });
    const win = window.open('', '_blank');
    if (!win) return;
    const esc = (s: string) => s.replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]!));
    win.document.write(`<html><head><title>Label - ${esc(m.naam)}</title><style>body{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;margin:0;font-family:sans-serif;text-align:center}h2{font-size:1.5rem;margin:1rem 0 0}@media print{body{height:auto}button{display:none}}</style></head><body><img src="${dataUrl}" alt="QR" /><h2>${esc(m.naam)}</h2><button onclick="window.print()">🖨️ Afdrukken</button></body></html>`);
    win.document.close();
  }

  async showQrCode(m: Materiaal): Promise<void> {
    const url = `${window.location.origin}/lening/${m.id}`;
    const dataUrl = await QRCode.toDataURL(url, { width: 200, margin: 2 });
    const win = window.open('', '_blank');
    if (!win) return;
    const esc = (s: string) => s.replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]!));
    win.document.write(`<html><head><title>QR - ${esc(m.naam)}</title><style>body{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;margin:0;font-family:sans-serif;text-align:center;padding:2rem}h2{font-size:1.5rem;margin:1rem 0 0}</style></head><body><img src="${dataUrl}" alt="QR" /><h2>${esc(m.naam)}</h2><p style="color:#666;margin-top:0.5rem">Scan om te lenen/retourneren</p></body></html>`);
    win.document.close();
  }
}
