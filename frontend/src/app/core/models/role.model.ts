// Single source of truth for all roles.
// When adding a new role: update this file ONLY — all consumers import from here.
export type Role = 'Beheer' | 'Lid' | 'Bestuur' | 'MateriaalCommissie' | 'InstructieKader';

export const ALL_ROLES: Role[] = [
  'Beheer',
  'Lid',
  'Bestuur',
  'MateriaalCommissie',
  'InstructieKader',
];

/** Roles that grant administrative access (all roles except 'Lid'). */
export const ADMIN_ROLES: Role[] = ['Beheer', 'Bestuur', 'MateriaalCommissie', 'InstructieKader'];
