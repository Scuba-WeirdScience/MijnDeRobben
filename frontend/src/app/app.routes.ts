import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'members', pathMatch: 'full' },

  {
    path: 'auth',
    loadChildren: () =>
      import('./features/auth/auth.routes').then(m => m.authRoutes)
  },

  {
    path: 'members',
    canActivate: [authGuard],
    loadChildren: () =>
      import('./features/members/members.routes').then(m => m.membersRoutes)
  },

  {
    path: 'profile',
    canActivate: [authGuard],
    loadChildren: () =>
      import('./features/profile/profile.routes').then(m => m.profileRoutes)
  },

  {
    path: 'lening',
    loadChildren: () =>
      import('./features/lening/lening.routes').then(m => m.leningRoutes)
  },

  {
    path: 'mijn-materialen',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/member/mijn-materialen.component').then(m => m.MijnMaterialenComponent)
  },

  {
    path: 'berichten',
    canActivate: [authGuard],
    loadChildren: () =>
      import('./features/berichten/berichten.routes').then(m => m.berichtenRoutes)
  },

  {
    path: 'activiteiten',
    loadChildren: () =>
      import('./features/activiteiten/activiteiten.routes').then(m => m.activiteitenRoutes)
  },

  {
    path: 'admin',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['Beheer', 'Bestuur'] },
    loadChildren: () =>
      import('./features/admin/admin.routes').then(m => m.adminRoutes)
  },

  { path: '**', redirectTo: 'members' }
];
