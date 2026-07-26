import { html, type TemplateResult } from "lit";
import { t } from "./i18n";
import type { HomeAssistant } from "./types";

/**
 * Small expandable info block: a subtle info-icon summary that unfolds an
 * explanation paragraph. Translation keys:
 *   config_panel.help_<key>_title   (short summary label)
 *   config_panel.help_<key>_body    (explanation text)
 */
export function renderHelp(
  hass: HomeAssistant | undefined,
  key: string
): TemplateResult {
  return html`
    <details class="inline-help">
      <summary>
        <ha-icon class="inline-help-icon" icon="mdi:information-outline"></ha-icon>
        ${t(hass, `config_panel.help_${key}_title`)}
      </summary>
      <p>${t(hass, `config_panel.help_${key}_body`)}</p>
    </details>
  `;
}
