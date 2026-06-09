import { Component, ChangeDetectionStrategy } from '@angular/core';
import {
  LookupTypeManagementComponent,
  LookupTypeConfig,
} from '../lookup-type-management/lookup-type-management.component';

const config: LookupTypeConfig = {
  pageTitle: 'Specialiteiten beheer',
  sectionLabel: 'Specialiteiten',
  itemLabel: 'specialiteit',
  naamHint: 'Bijv. Nitrox, Wreck Diver, ...',
  getAllFn: 'getSpecialtyTypes',
  createFn: 'createSpecialtyType',
  updateFn: 'updateSpecialtyType',
  deleteFn: 'deleteSpecialtyType',
};

@Component({
  selector: 'app-specialty-type-management',
  standalone: true,
  imports: [LookupTypeManagementComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './specialty-type-management.component.html',
})
export class SpecialtyTypeManagementComponent {
  readonly config = config;
}
