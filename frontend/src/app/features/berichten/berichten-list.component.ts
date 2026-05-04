import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import {
  ButtonComponent,
  SidePanelComponent,
  SpinnerComponent,
  EmptyStateComponent,
  BadgeComponent,
  FormFieldComponent,
  InputComponent,
  ConfirmDialogComponent,
  RichTextEditorComponent,
  PageContainerComponent,
} from '../../shared/components/design-system';
import { ToastService } from '../../shared/components/toast/toast.service';
import { AuthService } from '../../core/auth/auth.service';
import {
  BerichtenService,
  BerichtSummary,
  BerichtDetail,
  CreateBerichtRequest,
} from './berichten.service';
import { LucidePlus, LucideMail, LucideMailOpen, LucideTrash2 } from '../../shared/lucide-icons';

// Tailwind safelist — do NOT remove
const _TW_SAFELIST = [
  'bg-scuba-50', 'dark:bg-scuba-900/20', 'border-scuba-200', 'dark:border-scuba-700',
  'hover:bg-scuba-100', 'dark:hover:bg-scuba-900/30',
  'hover:bg-gray-50', 'dark:hover:bg-gray-700/50',
  'font-bold', 'font-semibold',
];

@Component({
  selector: 'app-berichten-list',
  standalone: true,
  imports: [
    CommonModule,
    ButtonComponent,
    SidePanelComponent,
    SpinnerComponent,
    EmptyStateComponent,
    BadgeComponent,
    FormFieldComponent,
    InputComponent,
    ConfirmDialogComponent,
    RichTextEditorComponent,
    LucidePlus,
    LucideMail,
    LucideMailOpen,
    LucideTrash2,
    PageContainerComponent,
  ],
  templateUrl: './berichten-list.component.html',
})
export class BerichtenListComponent implements OnInit {
  private readonly berichtenService = inject(BerichtenService);
  private readonly toast = inject(ToastService);
  private readonly sanitizer = inject(DomSanitizer);
  readonly auth = inject(AuthService);

  readonly loading = signal(true);
  readonly berichten = signal<BerichtSummary[]>([]);

  // Compose panel
  readonly composeOpen = signal(false);
  readonly saving = signal(false);
  readonly onderwerp = signal('');
  readonly inhoud = signal('');
  readonly isPinned = signal(false);

  // Detail panel
  readonly detailOpen = signal(false);
  readonly detailLoading = signal(false);
  readonly selectedBericht = signal<BerichtDetail | null>(null);
  readonly togglingGelezen = signal(false);

  // Delete confirmation
  readonly deleteTarget = signal<BerichtSummary | null>(null);
  readonly deleting = signal(false);

  readonly isAdmin = () => this.auth.hasAnyRole(['Beheer', 'Bestuur', 'Admin']);

  safeHtml(html: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  ngOnInit(): void {
    this.loadBerichten();
  }

  loadBerichten(): void {
    this.loading.set(true);
    this.berichtenService.getAll().subscribe({
      next: list => {
        this.berichten.set(list);
        this.loading.set(false);
      },
      error: () => {
        this.toast.error('Berichten konden niet worden geladen.');
        this.loading.set(false);
      }
    });
  }

  openDetail(bericht: BerichtSummary): void {
    this.detailOpen.set(true);
    this.detailLoading.set(true);
    this.selectedBericht.set(null);

    this.berichtenService.getById(bericht.id).subscribe({
      next: detail => {
        this.selectedBericht.set(detail);
        this.detailLoading.set(false);

        // Mark as read in the local list without a full reload
        this.berichten.update(list =>
          list.map(b => b.id === bericht.id ? { ...b, isGelezen: true } : b)
        );
      },
      error: () => {
        this.detailLoading.set(false);
        this.detailOpen.set(false);
        this.toast.error('Bericht kon niet worden geladen.');
      }
    });
  }

  toggleGelezenFromList(bericht: BerichtSummary, event: Event): void {
    event.stopPropagation();
    const markAsRead = !bericht.isGelezen;
    const call = markAsRead
      ? this.berichtenService.markeerGelezen(bericht.id)
      : this.berichtenService.markeerOngelezen(bericht.id);

    call.subscribe({
      next: () => {
        this.berichten.update(list =>
          list.map(b => b.id === bericht.id ? { ...b, isGelezen: markAsRead } : b)
        );
      },
      error: () => this.toast.error('Status kon niet worden gewijzigd.')
    });
  }

  toggleGelezenFromDetail(detail: BerichtDetail): void {
    const currentSummary = this.berichten().find(b => b.id === detail.id);
    const isCurrentlyRead = currentSummary?.isGelezen ?? true;
    const markAsRead = !isCurrentlyRead;

    this.togglingGelezen.set(true);
    const call = markAsRead
      ? this.berichtenService.markeerGelezen(detail.id)
      : this.berichtenService.markeerOngelezen(detail.id);

    call.subscribe({
      next: () => {
        this.togglingGelezen.set(false);
        this.berichten.update(list =>
          list.map(b => b.id === detail.id ? { ...b, isGelezen: markAsRead } : b)
        );
      },
      error: () => {
        this.togglingGelezen.set(false);
        this.toast.error('Status kon niet worden gewijzigd.');
      }
    });
  }

  isBerichtGelezen(id: string): boolean {
    return this.berichten().find(b => b.id === id)?.isGelezen ?? true;
  }

  openCompose(): void {
    this.onderwerp.set('');
    this.inhoud.set('');
    this.isPinned.set(false);
    this.composeOpen.set(true);
  }

  submitBericht(): void {
    const req: CreateBerichtRequest = {
      onderwerp: this.onderwerp().trim(),
      inhoud: this.inhoud().trim(),
      isPinned: this.isPinned(),
    };

    if (!req.onderwerp || !req.inhoud) {
      this.toast.warning('Vul een onderwerp en inhoud in.');
      return;
    }

    this.saving.set(true);
    this.berichtenService.create(req).subscribe({
      next: nieuw => {
        this.berichten.update(list => [nieuw, ...list]);
        this.composeOpen.set(false);
        this.saving.set(false);
        this.toast.success('Bericht aangemaakt.');

      },
      error: () => {
        this.saving.set(false);
        this.toast.error('Bericht kon niet worden aangemaakt.');
      }
    });
  }

  confirmDelete(bericht: BerichtSummary, event: Event): void {
    event.stopPropagation();
    this.deleteTarget.set(bericht);
  }

  deleteFromDetail(detail: BerichtDetail): void {
    this.detailOpen.set(false);
    this.deleteTarget.set(detail);
  }

  executeDelete(): void {
    const target = this.deleteTarget();
    if (!target) return;

    this.deleting.set(true);
    this.berichtenService.delete(target.id).subscribe({
      next: () => {
        this.berichten.update(list => list.filter(b => b.id !== target.id));
        this.deleteTarget.set(null);
        this.deleting.set(false);
        this.toast.success('Bericht verwijderd.');

      },
      error: () => {
        this.deleting.set(false);
        this.toast.error('Bericht kon niet worden verwijderd.');
      }
    });
  }
}
