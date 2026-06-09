import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LeningService, LeningDoc } from '../lening/lening.service';
import { AuthService } from '../../core/auth/auth.service';
import { VerzorgerContextService } from '../../core/services/verzorger-context.service';

@Component({
  selector: 'app-mijn-materialen',
  standalone: true,
  imports: [CommonModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './mijn-materialen.component.html',
})
export class MijnMaterialenComponent implements OnInit {
  private readonly leningService = inject(LeningService);
  readonly auth = inject(AuthService);
  readonly verzorgerCtx = inject(VerzorgerContextService);

  readonly loading = signal(true);
  readonly leningen = signal<LeningDoc[]>([]);

  ngOnInit(): void {
    this.loadLeningen();
  }

  private loadLeningen(): void {
    const activeKind = this.verzorgerCtx.activeKind();

    const obs$ = activeKind
      ? this.leningService.getLeningenVoorLid(activeKind.id)
      : this.leningService.getMyLeningen();

    obs$.subscribe({
      next: (list) => {
        this.leningen.set(list);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }
}
