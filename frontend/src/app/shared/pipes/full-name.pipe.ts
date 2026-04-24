import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'fullName', standalone: true })
export class FullNamePipe implements PipeTransform {
  transform(value: { firstName: string; lastName: string }): string {
    return `${value.firstName} ${value.lastName}`.trim();
  }
}
