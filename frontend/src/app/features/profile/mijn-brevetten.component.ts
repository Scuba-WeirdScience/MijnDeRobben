import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { BrevetService, BrevetDoc } from './brevet.service';
import { SpinnerComponent } from '../../shared/components/spinner/spinner.component';

@Component({
  selector: 'app-mijn-brevetten',
  standalone: true,
  imports: [CommonModule, RouterLink, SpinnerComponent],
  templateUrl: './mijn-brevetten.component.html',
})
export class MijnBrevettenComponent implements OnInit {
  private readonly brevetService = inject(BrevetService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly brevetten = signal<BrevetDoc[]>([]);

  ngOnInit(): void {
    this.loading.set(true);
    this.brevetService.getMyBrevetten().subscribe({
      next: (list) => {
        this.brevetten.set(list);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Kon brevetgegevens niet laden.');
      },
    });
  }
}
