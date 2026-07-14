import { html, type TemplateResult } from "lit";
import { t } from "./i18n";
import type { HomeAssistant } from "./types";

/**
 * Small expandable info block: a subtle "ⓘ" summary that unfolds an
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
        <span class="inline-help-icon">ⓘ</span>
        ${t(hass, `config_panel.help_${key}_title`)}
      </summary>
      <p>${t(hass, `config_panel.help_${key}_body`)}</p>
    </details>
  `;
}
