/**
 * Barrel re-export for cross-feature lookup services.
 * Import lookup services from here — never import directly from feature folders.
 */
export { BrevetTypeService } from '../../features/admin/brevet-type-management/brevet-type.service';
export type { BrevetTypeDef } from '../../features/admin/brevet-type-management/brevet-type.service';
export { SpecialtyTypeService } from '../../features/admin/specialty-type-management/specialty-type.service';
export type { SpecialtyType } from '../../features/admin/specialty-type-management/specialty-type.service';
