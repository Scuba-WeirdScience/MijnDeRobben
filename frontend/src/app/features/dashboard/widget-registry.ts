/**
 * Widget registry — single source of truth for available dashboard widget types.
 *
 * To add a new widget type:
 * 1. Add an entry in AVAILABLE_WIDGETS below
 * 2. Add a rendering branch in dashboard.component.html (`@else if (widget === 'my-widget')`)
 */

export interface WidgetDefinition {
  id: string;
  title: string;
  description: string;
}

export const AVAILABLE_WIDGETS: Record<string, WidgetDefinition> = {
  leningen: {
    id: 'leningen',
    title: 'Mijn geleende materialen',
    description: 'Toon een overzicht van materialen die je hebt geleend',
  },
  activiteiten: {
    id: 'activiteiten',
    title: 'Aankomende activiteiten',
    description: 'Toon een overzicht van aankomende activiteiten',
  },
};

export const ALL_WIDGET_IDS = Object.keys(AVAILABLE_WIDGETS);
