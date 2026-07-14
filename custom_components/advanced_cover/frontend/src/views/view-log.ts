import { LitElement, css, html, nothing } from "lit";
import { defineCustomElementOnce, formatTime } from "../helpers";
import { t } from "../i18n";
import { sharedStyles } from "../styles";
import type { HomeAssistant, PanelSnapshot } from "../types";

export class ViewLog extends LitElement {
  static properties = {
    hass: { attribute: false },
    entryId: { type: String },
    snapshot: { attribute: false },
  };

  hass!: HomeAssistant;
  entryId!: string;
  snapshot!: PanelSnapshot;

  private _coverFilter = "";
  private _showRaw = false;

  static styles = [
    sharedStyles,
    css`
      pre.raw {
        font-size: 0.75rem;
        overflow-x: auto;
        background: var(--secondary-background-color, rgba(0, 0, 0, 0.04));
        padding: 12px;
        border-radius: 8px;
      }
    `,
  ];

  protected render() {
    const snap = this.snapshot;
    if (!snap) return nothing;
    const entries = snap.log.filter(
      (e) => !this._coverFilter || e.cover_item_id === this._coverFilter
    );
    return html`
      <ha-card>
        <div class="card-header">
          <ha-icon icon="mdi:history"></ha-icon>
          ${t(this.hass, "config_panel.log_title")}
        </div>
        <div class="card-content">
          <p class="intro">${t(this.hass, "config_panel.log_intro")}</p>
          <div class="row">
            <div>
              <label class="field-label">${t(this.hass, "config_panel.log_filter_cover")}</label>
              <select
                style="width:auto"
                @change=${(e: Event) => {
                  this._coverFilter = (e.target as HTMLSelectElement).value;
                  this.requestUpdate();
                }}
              >
                <option value="">${t(this.hass, "config_panel.log_filter_all")}</option>
                ${snap.covers.map(
                  (c) => html`
                    <option value=${c.id} ?selected=${this._coverFilter === c.id}>
                      ${c.name}
                    </option>
                  `
                )}
              </select>
            </div>
          </div>
          ${entries.length
            ? html`
                <table class="plain">
                  <tr>
                    <th>${t(this.hass, "config_panel.log_col_time")}</th>
                    <th>${t(this.hass, "config_panel.log_col_cover")}</th>
                    <th>${t(this.hass, "config_panel.log_col_scenario")}</th>
                    <th>${t(this.hass, "config_panel.log_col_result")}</th>
                    <th>${t(this.hass, "config_panel.log_col_reason")}</th>
                  </tr>
                  ${entries.map(
                    (e) => html`
                      <tr>
                        <td>${formatTime(e.time)}</td>
                        <td>${e.cover_name}</td>
                        <td>${e.scenario_name}</td>
                        <td>
                          <span class="badge badge-${e.result}">
                            ${t(this.hass, `config_panel.status_${e.result}`)}
                          </span>
                          ${e.position != null
                            ? html`<span class="muted"> ${e.position}%</span>`
                            : nothing}
                        </td>
                        <td class="muted">${e.reason ?? ""}</td>
                      </tr>
                    `
                  )}
                </table>
              `
            : html`<div class="empty-state">
                <ha-icon icon="mdi:text-box-outline"></ha-icon>
                <p>${t(this.hass, "config_panel.log_empty")}</p>
              </div>`}
          <details
            class="expand"
            @toggle=${(e: Event) => {
              this._showRaw = (e.target as HTMLDetailsElement).open;
              this.requestUpdate();
            }}
          >
            <summary>${t(this.hass, "config_panel.log_show_raw")}</summary>
            ${this._showRaw
              ? html`<pre class="raw">${JSON.stringify(snap, null, 2)}</pre>`
              : nothing}
          </details>
        </div>
      </ha-card>
    `;
  }
}

defineCustomElementOnce("ac-view-log", ViewLog);
