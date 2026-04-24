/**
 * Design System — Volledige component barrel
 *
 * Angular 21 signal-based standalone componenten.
 * Importeer alle DSC componenten vanuit dit bestand.
 *
 * Usage:
 * ```typescript
 * import { ButtonComponent, SidePanelComponent, BadgeComponent }
 *   from '../../../shared/components/design-system';
 * ```
 */

// ── Form Controls ──────────────────────────────────────────────────────────
export { FormFieldComponent }     from './form-field/form-field.component';
export { InputComponent }         from './form-field/input/input.component';
export { SelectComponent }        from './form-field/select/select.component';
export { TextareaComponent }      from './form-field/textarea/textarea.component';
// Token voor custom form-integraties
export { FORM_FIELD }             from './form-field/form-field.token';
export type { FormValueControl }  from './form-field/form-field.token';

// ── Actions ────────────────────────────────────────────────────────────────
export { ButtonComponent }        from './button/button.component';
export { ConfirmDialogComponent } from './confirm-dialog/confirm-dialog.component';

// ── Layout & Structuur ─────────────────────────────────────────────────────
export { CardComponent }          from './card/card.component';
export { PageHeaderComponent }    from './page-header/page-header.component';
export { SidePanelComponent }     from './side-panel/side-panel.component';
export { TabsComponent }          from './tabs/tabs.component';
export { TabComponent }           from './tabs/tab/tab.component';

// ── Feedback & Status ──────────────────────────────────────────────────────
export { SpinnerComponent }       from './spinner/spinner.component';
export { AlertComponent }         from './alert/alert.component';
export { BadgeComponent }         from './badge/badge.component';
export { EmptyStateComponent }    from './empty-state/empty-state.component';

// ── Data Display ───────────────────────────────────────────────────────────
export { PaginationComponent }    from './pagination/pagination.component';

// ── Rich Text ──────────────────────────────────────────────────────────────
export { RichTextEditorComponent } from './rich-text-editor/rich-text-editor.component';
