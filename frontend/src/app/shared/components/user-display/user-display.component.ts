import { Component, input, computed } from '@angular/core';
import { NgClass } from '@angular/common';

/** Deterministic background color from a GUID string. */
function guidToColor(guid: string): string {
  const hash = [...guid].reduce((acc, ch, i) => acc + ch.charCodeAt(0) * (i + 1), 0);
  const hue = hash % 360;
  return `hsl(${hue}, 55%, 45%)`;
}

@Component({
  selector: 'app-user-display',
  standalone: true,
  imports: [NgClass],
  templateUrl: './user-display.component.html',
})
export class UserDisplayComponent {
  readonly member = input.required<{
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string | null;
  }>();

  /** 'xs' | 'sm' | 'md' | 'lg' — mobile-first: 'xs' is default, scales up */
  readonly size = input<'xs' | 'sm' | 'md' | 'lg'>('xs');

  /** Avatar URLs from Firebase Storage are already full URLs — no prefix needed. */
  protected readonly apiBase = '';

  readonly fullName = computed(() => {
    const m = this.member();
    return `${m.firstName} ${m.lastName}`.trim();
  });

  readonly initials = computed(() => {
    const m = this.member();
    const f = m.firstName?.trim()[0] ?? '';
    const l = m.lastName?.trim()[0] ?? '';
    return (f + l).toUpperCase() || '?';
  });

  readonly bgColor = computed(() => guidToColor(this.member().id));

  readonly avatarSizeClass = computed(() => ({
    'w-7 h-7':    this.size() === 'xs',
    'w-8 h-8':    this.size() === 'sm',
    'w-10 h-10':  this.size() === 'md',
    'w-12 h-12':  this.size() === 'lg',
  }));

  readonly textSizeClass = computed(() => ({
    'text-[10px]': this.size() === 'xs',
    'text-xs':     this.size() === 'sm',
    'text-sm':     this.size() === 'md',
    'text-base':   this.size() === 'lg',
  }));
}
