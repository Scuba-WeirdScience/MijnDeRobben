import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService, LoginApiError } from '../../../core/auth/auth.service';
import { createSignalForm } from '../../../shared/forms/signal-form';
import { LoginRequestSchema } from '../../../../generated/api-schemas';

type LoginStep = 'credentials' | 'geboortedatum';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './login.component.html',
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly serverError = signal('');
  readonly loginStep = signal<LoginStep>('credentials');

  /** Managed separately from the Zod form — only shown/required in step 2. */
  readonly geboortedatum = signal('');
  readonly geboortedatumError = signal('');

  readonly form = createSignalForm(LoginRequestSchema, { email: '', password: '' });

  setField(field: 'email' | 'password', value: string): void {
    this.form.fields[field].value.set(value);
    this.form.fields[field].touched.set(true);
  }

  async submitCredentials(): Promise<void> {
    this.form.markAllTouched();
    const value = this.form.getValue();
    if (!value) return;

    this.loading.set(true);
    this.serverError.set('');

    try {
      const user = await this.auth.login(value.email, value.password);
      // Use the user returned directly from login — avoids reading the signal
      // before onAuthStateChanged has had a chance to update it.
      if (user && !user.roles.includes('Lid') && !user.roles.includes('Beheer')) {
        // User exists but has no role yet — needs validation step
        this.loginStep.set('geboortedatum');
      } else {
        this.router.navigate(['/dashboard']);
      }
    } catch (err: unknown) {
      if (err instanceof LoginApiError) {
        const code = err.code;
        if (code === 'auth/user-disabled') {
          this.serverError.set('Uw account is inactief. Neem contact op met de beheerder.');
        } else {
          this.serverError.set('Ongeldig e-mailadres of wachtwoord.');
        }
      } else {
        this.serverError.set('Ongeldig e-mailadres of wachtwoord.');
      }
    } finally {
      this.loading.set(false);
    }
  }

  async submitGeboortedatum(): Promise<void> {
    const dob = this.geboortedatum().trim();
    if (!dob) {
      this.geboortedatumError.set('Geboortedatum is verplicht.');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
      this.geboortedatumError.set('Datum moet in formaat JJJJ-MM-DD zijn.');
      return;
    }
    this.geboortedatumError.set('');

    this.loading.set(true);
    this.serverError.set('');

    try {
      await this.auth.validateGeboortedatum(dob);
      this.router.navigate(['/dashboard']);
    } catch (err: unknown) {
      if (err instanceof LoginApiError && err.code === 'InvalidGeboortedatum') {
        this.geboortedatumError.set('Geboortedatum komt niet overeen. Probeer opnieuw.');
      } else {
        this.serverError.set('Er is een fout opgetreden. Probeer opnieuw.');
      }
    } finally {
      this.loading.set(false);
    }
  }

  backToCredentials(): void {
    this.loginStep.set('credentials');
    this.serverError.set('');
    this.geboortedatumError.set('');
    this.geboortedatum.set('');
  }
}
