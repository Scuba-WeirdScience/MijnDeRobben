import { Routes } from '@angular/router';
import { roleGuard } from '../../core/guards/role.guard';

export const adminRoutes: Routes = [
  {
    path: '',
    redirectTo: 'members',
    pathMatch: 'full'
  },
  {
    path: 'members',
    loadComponent: () =>
      import('./member-management/member-management.component').then(m => m.MemberManagementComponent)
  },
  {
    path: 'roles',
    canActivate: [roleGuard],
    data: { roles: ['Beheer'] },
    loadComponent: () =>
      import('./role-management/role-management.component').then(m => m.RoleManagementComponent)
  },
  {
    path: 'brevetten',
    canActivate: [roleGuard],
    data: { roles: ['InstructieKader', 'Bestuur', 'Beheer'] },
    loadComponent: () =>
      import('./brevet-management/brevet-management.component').then(m => m.BrevetManagementComponent)
  },
  {
    path: 'specialiteiten',
    canActivate: [roleGuard],
    data: { roles: ['InstructieKader', 'Bestuur', 'Beheer'] },
    loadComponent: () =>
      import('./specialty-type-management/specialty-type-management.component').then(m => m.SpecialtyTypeManagementComponent)
  },
  {
    path: 'brevet-types',
    canActivate: [roleGuard],
    data: { roles: ['InstructieKader', 'Bestuur', 'Beheer'] },
    loadComponent: () =>
      import('./brevet-type-management/brevet-type-management.component').then(m => m.BrevetTypeManagementComponent)
  },
  {
    path: 'materialen',
    canActivate: [roleGuard],
    data: { roles: ['MateriaalCommissie', 'Bestuur', 'Beheer'] },
    loadComponent: () =>
      import('./materiaal-beheer/materiaal-beheer.component').then(m => m.MateriaalBeheerComponent)
  },
  {
    path: 'groepen',
    canActivate: [roleGuard],
    data: { roles: ['Beheer', 'Bestuur'] },
    loadComponent: () =>
      import('../berichten/components/groep-beheer/groep-beheer.component').then(m => m.GroepBeheerComponent)
  }
];
