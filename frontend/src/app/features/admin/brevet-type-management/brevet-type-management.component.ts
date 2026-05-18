import { Component } from '@angular/core';
import {
  LookupTypeManagementComponent,
  LookupTypeConfig,
} from '../lookup-type-management/lookup-type-management.component';

const config: LookupTypeConfig = {
  pageTitle: 'Brevet types beheer',
  sectionLabel: 'Brevet types',
  itemLabel: 'brevet type',
  naamHint: 'Bijv. 1-ster, Open Water, Niveau 2, ...',
  getAllFn: 'getBrevetTypes',
  createFn: 'createBrevetType',
  updateFn: 'updateBrevetType',
  deleteFn: 'deleteBrevetType',
};

@Component({
  selector: 'app-brevet-type-management',
  standalone: true,
  imports: [LookupTypeManagementComponent],
  templateUrl: './brevet-type-management.component.html',
})
export class BrevetTypeManagementComponent {
  readonly config = config;
}
