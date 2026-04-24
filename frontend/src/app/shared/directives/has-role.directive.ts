import { Directive, input, TemplateRef, ViewContainerRef, effect, inject } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';

@Directive({
  selector: '[appHasRole]',
  standalone: true
})
export class HasRoleDirective {
  /** Roles required (any match) — passed via the `appHasRole` selector binding */
  readonly roles = input<string[]>([]);

  private readonly templateRef = inject(TemplateRef<unknown>);
  private readonly viewContainer = inject(ViewContainerRef);
  private readonly auth = inject(AuthService);

  constructor() {
    // effect() must be created inside the injection context (constructor).
    // It re-runs whenever the roles input or auth state changes.
    effect(() => {
      this.updateView();
    });
  }

  private updateView(): void {
    if (this.auth.hasAnyRole(this.roles())) {
      if (this.viewContainer.length === 0) {
        this.viewContainer.createEmbeddedView(this.templateRef);
      }
    } else {
      this.viewContainer.clear();
    }
  }
}
