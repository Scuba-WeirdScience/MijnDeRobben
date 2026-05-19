import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LeningService } from './lening.service';
import { AuthService } from '../../core/auth/auth.service';
import { MateriaalLeningStatus } from '../../../generated/api-schemas';
import { LucideChevronLeft } from '../../shared/lucide-icons';

@Component({
  selector: 'app-scan-materiaal',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideChevronLeft],
  templateUrl: './scan-materiaal.component.html',
})
export class ScanMateriaalComponent implements OnInit {
  readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly leningService = inject(LeningService);
  readonly auth = inject(AuthService);

  readonly loading = signal(true);
  readonly taking = signal(false);
  readonly returning = signal(false);
  readonly status = signal<MateriaalLeningStatus | null>(null);
  readonly error = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);
  readonly showReturnForm = signal(false);
  returnNotities = '';

  private materiaalId = '';

  ngOnInit(): void {
    this.materiaalId = this.route.snapshot.paramMap.get('id') ?? '';
    if (!this.materiaalId) {
      this.loading.set(false);
      return;
    }
    this.loadStatus();
  }

  private loadStatus(): void {
    this.loading.set(true);
    this.error.set(null);
    this.leningService.getMateriaalStatus(this.materiaalId).subscribe({
      next: res => {
        this.status.set(res);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Kon materiaalstatus niet laden.');
        this.loading.set(false);
      }
    });
  }

  take(): void {
    this.taking.set(true);
    this.error.set(null);
    this.leningService.take(this.materiaalId).subscribe({
      next: () => {
        this.successMessage.set('Materiaal succesvol geleend!');
        this.taking.set(false);
        this.loadStatus();
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      error: (err: any) => {
        this.error.set(err?.error?.error || 'Lenen mislukt. Probeer opnieuw.');
        this.taking.set(false);
      }
    });
  }

  confirmReturn(): void {
    this.returning.set(true);
    const leningId = this.status()?.huidigeLeningId;
    if (!leningId) {
      this.error.set('Geen lening gevonden.');
      this.returning.set(false);
      return;
    }
    this.leningService.return$(leningId, this.returnNotities || undefined).subscribe({
      next: () => {
        this.successMessage.set('Materiaal succesvol geretourneerd!');
        this.returning.set(false);
        this.showReturnForm.set(false);
        this.returnNotities = '';
        this.loadStatus();
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      error: (err: any) => {
        this.error.set(err?.error?.error || 'Retournneren mislukt. Probeer opnieuw.');
        this.returning.set(false);
      }
    });
  }

  goBack(): void {
    if (window.history.length > 1) {
      this.router.navigate(['/']);
    } else {
      this.router.navigate(['/members']);
    }
  }
}
