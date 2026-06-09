import {
  Component,
  inject,
  signal,
  effect,
  input,
  DestroyRef,
  ChangeDetectionStrategy,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, switchMap, of, catchError } from 'rxjs';
import { LeningService, LeningDoc } from '../../lening/lening.service';
import { SpinnerComponent } from '../../../shared/components/spinner/spinner.component';
import { LocaleDatePipe } from '../../../shared/pipes/locale-date.pipe';

@Component({
  selector: 'app-materiaal-lening-history',
  standalone: true,
  imports: [SpinnerComponent, LocaleDatePipe],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './materiaal-lening-history.component.html',
})
export class MateriaalLeningHistoryComponent {
  private readonly leningService = inject(LeningService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly trigger$ = new Subject<string>();

  readonly materiaalId = input<string | null | undefined>(null);

  readonly loading = signal(false);
  readonly leningen = signal<LeningDoc[]>([]);
  readonly error = signal(false);

  constructor() {
    this.trigger$
      .pipe(
        switchMap((id) => {
          this.loading.set(true);
          this.error.set(false);
          return this.leningService.getByMateriaalId(id).pipe(
            catchError(() => {
              this.error.set(true);
              return of([] as LeningDoc[]);
            })
          );
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((list) => {
        this.leningen.set(list);
        this.loading.set(false);
      });

    effect(() => {
      const id = this.materiaalId();
      if (!id) {
        this.leningen.set([]);
        return;
      }
      this.trigger$.next(id);
    });
  }
}
