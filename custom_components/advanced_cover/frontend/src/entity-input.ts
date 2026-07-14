import { html, type TemplateResult } from "lit";
import type { HomeAssistant } from "./types";

/** Entity IDs of the given domains, favorites first. */
export function entityIdsForDomains(
  hass: HomeAssistant,
  domains: string[] | null,
  favorites: string[] = []
): string[] {
  const all = Object.keys(hass.states)
    .filter((eid) => !domains || domains.includes(eid.split(".", 1)[0]))
    .sort((a, b) => a.localeCompare(b));
  if (!favorites.length) return all;
  const favSet = new Set(favorites);
  return [...favorites.filter((f) => all.includes(f)), ...all.filter((e) => !favSet.has(e))];
}

/** One shared `<datalist>` per form (by stable `listId`). */
export function renderEntityDatalist(
  hass: HomeAssistant,
  listId: string,
  domains: string[] | null,
  favorites: string[] = []
): TemplateResult {
  const ids = entityIdsForDomains(hass, domains, favorites);
  return html`
    <datalist id=${listId}>
      ${ids.map((id) => html`<option value=${id}></option>`)}
    </datalist>
  `;
}

/**
 * Browser autocomplete for entity_id — works inside panel_custom scoped
 * registries where `ha-entity-picker` is not registered.
 */
export function renderEntityField(
  listId: string,
  label: string,
  value: string,
  onValue: (v: string) => void,
  placeholder = ""
): TemplateResult {
  return html`
    <div>
      <label class="field-label">${label}</label>
      <input
        type="text"
        list=${listId}
        .value=${value}
        placeholder=${placeholder}
        spellcheck="false"
        autocomplete="off"
        @input=${(e: Event) => onValue((e.target as HTMLInputElement).value)}
      />
    </div>
  `;
}
