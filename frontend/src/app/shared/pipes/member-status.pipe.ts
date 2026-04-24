import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'memberStatus', standalone: true })
export class MemberStatusPipe implements PipeTransform {
  transform(value: { isActive: boolean } | boolean): string {
    const isActive = typeof value === 'boolean' ? value : value.isActive;
    return isActive ? 'Actief' : 'Inactief';
  }
}
