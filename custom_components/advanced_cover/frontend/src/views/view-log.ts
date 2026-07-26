import { LitElement, css, html, nothing } from "lit";
import { defineCustomElementOnce, formatTime } from "../helpers";
import { t } from "../i18n";
import { sharedStyles } from "../styles";
import type { HomeAssistant, LogEntry, PanelSnapshot } from "../types";

type ResultFilter = "executed" | "skipped" | "blocked";

/** Map a raw log result to a filter bucket. */
function bucket(result: string): ResultFilter | null {
  if (result === "executed") return "executed";
  if (result === "skipped" || result === "expired") return "skipped";
  if (result === "blocked_safety" || result === "unavailable") return "blocked";
  return null;
}

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
  private _resultFilters = new Set<ResultFilter>();
  private _showRaw = false;
  private _copied = false;

  static styles = [
    sharedStyles,
    css`
      .log-toolbar {
        display: flex;
        flex-wrap: wrap;
        gap: 8px 10px;
        align-items: center;
        margin-bottom: 14px;
      }
      .log-list {
        display: flex;
        flex-direction: column;
      }
      .log-row {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px 4px;
        border-bottom: 1px solid var(--divider-color);
      }
      .log-dot {
        width: 9px;
        height: 9px;
        border-radius: 50%;
        flex-shrink: 0;
        background: var(--disabled-text-color, #6d7476);
      }
      .log-dot.executed {
        background: var(--success-color, #43a047);
      }
      .log-dot.skipped {
        background: var(--disabled-text-color, #6d7476);
      }
      .log-dot.blocked {
        background: var(--error-color, #d93025);
      }
      .log-time {
        font-variant-numeric: tabular-nums;
        font-size: 0.82rem;
        color: var(--secondary-text-color);
        flex-shrink: 0;
        width: 46px;
      }
      .log-body {
        min-width: 0;
        flex: 1;
      }
      .log-line1 {
        display: flex;
        align-items: baseline;
        gap: 8px;
      }
      .log-cover {
        font-weight: 500;
        font-size: 0.9rem;
      }
      .log-pos {
        font-size: 0.8rem;
        color: var(--secondary-text-color);
        font-variant-numeric: tabular-nums;
      }
      .log-line2 {
        font-size: 0.8rem;
        color: var(--secondary-text-color);
        margin-top: 1px;
      }
      .raw-head {
        display: flex;
        align-items: center;
        gap: 8px;
        margin: 8px 0;
      }
      pre.raw {
        font-size: 0.75rem;
        overflow-x: auto;
        background: var(--secondary-background-color, rgba(0, 0, 0, 0.04));
        padding: 12px;
        border-radius: 8px;
        margin: 0;
      }
    `,
  ];

  private _counts(): Record<ResultFilter, number> {
    const c: Record<ResultFilter, number> = { executed: 0, skipped: 0, blocked: 0 };
    for (const e of this.snapshot.log) {
      const b = bucket(e.result);
      if (b) c[b] += 1;
    }
    return c;
  }

  private _toggleResult(f: ResultFilter): void {
    if (this._resultFilters.has(f)) this._resultFilters.delete(f);
    else this._resultFilters.add(f);
    this.requestUpdate();
  }

  private _filtered(): LogEntry[] {
    return this.snapshot.log.filter((e) => {
      if (this._coverFilter && e.cover_item_id !== this._coverFilter) return false;
      if (this._resultFilters.size) {
        const b = bucket(e.result);
        if (!b || !this._resultFilters.has(b)) return false;
      }
      return true;
    });
  }

  private async _copyRaw(): Promise<void> {
    try {
      await navigator.clipboard.writeText(JSON.stringify(this.snapshot, null, 2));
      this._copied = true;
      this.requestUpdate();
      setTimeout(() => {
        this._copied = false;
        this.requestUpdate();
      }, 1500);
    } catch {
      /* clipboard unavailable */
    }
  }

  private _renderChip(f: ResultFilter, count: number) {
    const selected = this._resultFilters.has(f);
    return html`<button
      type="button"
      class="chip ${selected ? "selected" : ""}"
      @click=${() => this._toggleResult(f)}
    >
      ${t(this.hass, `config_panel.log_filter_${f}`)} ${count}
    </button>`;
  }

  protected render() {
    const snap = this.snapshot;
    if (!snap) return nothing;
    const counts = this._counts();
    const entries = this._filtered();
    return html`
      <ha-card>
        <div class="card-header">
          <ha-icon icon="mdi:history"></ha-icon>
          ${t(this.hass, "config_panel.log_title")}
          <span class="muted" style="font-weight:400">
            ${t(this.hass, "config_panel.log_today")} ·
            ${t(this.hass, "config_panel.log_entries", { n: snap.log.length })}
          </span>
        </div>
        <div class="card-content">
          <p class="intro">${t(this.hass, "config_panel.log_intro")}</p>
          <div class="log-toolbar">
            <div class="chips">
              ${this._renderChip("executed", counts.executed)}
              ${this._renderChip("skipped", counts.skipped)}
              ${this._renderChip("blocked", counts.blocked)}
            </div>
            <select
              style="width:auto"
              @change=${(e: Event) => {
                this._coverFilter = (e.target as HTMLSelectElement).value;
                this.requestUpdate();
              }}
            >
              <option value="">${t(this.hass, "config_panel.log_filter_all_covers")}</option>
              ${snap.covers.map(
                (c) => html`<option value=${c.id} ?selected=${this._coverFilter === c.id}>
                  ${c.name}
                </option>`
              )}
            </select>
          </div>
          ${entries.length
            ? html`<div class="log-list">
                ${entries.map((e) => this._renderRow(e))}
              </div>`
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
              ? html`<div class="raw-head">
                    <button class="btn-icon" @click=${this._copyRaw}>
                      <ha-icon
                        icon=${this._copied ? "mdi:check" : "mdi:content-copy"}
                        style="--mdc-icon-size:16px;vertical-align:-3px"
                      ></ha-icon>
                      ${this._copied
                        ? t(this.hass, "config_panel.log_copied")
                        : t(this.hass, "config_panel.log_copy")}
                    </button>
                  </div>
                  <pre class="raw">${JSON.stringify(snap, null, 2)}</pre>`
              : nothing}
          </details>
        </div>
      </ha-card>
    `;
  }

  private _renderRow(e: LogEntry) {
    const b = bucket(e.result) ?? "skipped";
    return html`
      <div class="log-row">
        <span class="log-time">${formatTime(e.time)}</span>
        <span class="log-dot ${b}"></span>
        <div class="log-body">
          <div class="log-line1">
            <span class="log-cover">${e.cover_name}</span>
            ${e.position != null
              ? html`<span class="log-pos">${e.position}%</span>`
              : nothing}
          </div>
          <div class="log-line2">
            ${e.scenario_name}${e.reason ? ` — ${e.reason}` : ""}
          </div>
        </div>
      </div>
    `;
  }
}

defineCustomElementOnce("ac-view-log", ViewLog);
