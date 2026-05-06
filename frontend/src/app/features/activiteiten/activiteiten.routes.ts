import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';

export const activiteitenRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./public/activiteiten-list-page.component').then(m => m.ActiviteitenListPageComponent),
  },
  {
    path: 'beheer',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./beheer/activiteiten-beheer.component').then(m => m.ActiviteitenBeheerComponent),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./public/activiteiten-detail-page.component').then(m => m.ActiviteitenDetailPageComponent),
  },
];
