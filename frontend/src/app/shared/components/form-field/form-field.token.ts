import { InjectionToken, InputSignal, ModelSignal } from '@angular/core';

/**
 * Contract dat een DSC form control implementeert zodat het integreerbaar
 * is met een toekomstige [formField] directive.
 */
export interface FormValueControl<T = string> {
  value: ModelSignal<T>;
  errors: InputSignal<readonly { message?: string }[]>;
  disabled: InputSignal<boolean>;
  invalid: InputSignal<boolean>;
}

/**
 * DI-token waaronder DSC form controls zichzelf registreren via viewProviders.
 * Vervangt de niet-bestaande '@angular/forms/signals' import.
 */
export const FORM_FIELD = new InjectionToken<FormValueControl>('DSC_FORM_FIELD');
