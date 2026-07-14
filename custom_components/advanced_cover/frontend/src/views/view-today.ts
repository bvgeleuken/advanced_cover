import { LitElement, css, html, nothing } from "lit";
import { recalculate, saveConfig } from "../data/api";
import { defineCustomElementOnce, formatApiError, formatTime, minutesOfDay, navigate } from "../helpers";
import { renderHelp } from "../help";
import { t } from "../i18n";
import { exportPath } from "../navigation";
import { sharedStyles } from "../styles";
import type { AssignmentRun, HomeAssistant, Occurrence, PanelSnapshot } from "../types";

/** Aggregate status of one planned assignment for coloring. */
function runBadge(occ: Occurrence, run: AssignmentRun): string {
  if (!occ.fired) return "planned";
  if (run.status === "armed") return "armed";
  if (run.status === "expired") return "expired";
  return run.result ?? "skipped";
}

export class ViewToday extends LitElement {
  static properties = {
    hass: { attribute: false },
    entryId: { type: String },
    snapshot: { attribute: false },
  };

  hass!: HomeAssistant;
  entryId!: string;
  snapshot!: PanelSnapshot;

  private _error?: string;
  private _busy = false;

  static styles = [
    sharedStyles,
    css`
      .head-row {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 12px 20px;
        padding: 4px 0;
      }
      .head-row .spacer {
        flex: 1;
      }
      .sun {
        font-size: 0.875rem;
        color: var(--secondary-text-color);
        white-space: nowrap;
      }
      .master {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 0.95rem;
      }
      .track-wrap {
        margin: 18px 4px 4px;
      }
      .track {
        position: relative;
        height: 34px;
        border-radius: 8px;
        background: var(--secondary-background-color, rgba(0, 0, 0, 0.05));
      }
      .track .hour-grid {
        position: absolute;
        inset: 0;
        display: flex;
      }
      .track .hour-grid span {
        flex: 1;
        border-left: 1px solid var(--divider-color);
        opacity: 0.5;
      }
      .track .hour-grid span:first-child {
        border-left: none;
      }
      .dot {
        position: absolute;
        top: 50%;
        transform: translate(-50%, -50%);
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: var(--primary-color);
        border: 2px solid var(--card-background-color);
        box-sizing: border-box;
        cursor: pointer;
        box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25);
        transition: transform 0.12s ease;
      }
      .dot:hover {
        transform: translate(-50%, -50%) scale(1.35);
        z-index: 1;
      }
      .dot.executed {
        background: var(--success-color, #0f9d58);
      }
      .dot.skipped,
      .dot.expired {
        background: var(--disabled-text-color, #9e9e9e);
      }
      .dot.armed {
        background: var(--warning-color, #f4b400);
      }
      .dot.blocked_safety,
      .dot.unavailable {
        background: var(--error-color, #d93025);
      }
      .now-line {
        position: absolute;
        top: -4px;
        bottom: -4px;
        width: 2px;
        background: var(--accent-color, #ff9800);
      }
      .axis {
        display: flex;
        justify-content: space-between;
        font-size: 0.7rem;
        color: var(--secondary-text-color);
        margin-top: 4px;
      }
      .occ {
        border: 1px solid var(--divider-color);
        border-radius: 8px;
        padding: 12px 14px;
        margin-bottom: 10px;
      }
      .occ-head {
        display: flex;
        flex-wrap: wrap;
        align-items: baseline;
        gap: 8px 14px;
        margin-bottom: 6px;
      }
      .occ-time {
        font-weight: 600;
        font-variant-numeric: tabular-nums;
      }
      .occ-name {
        font-weight: 500;
        cursor: pointer;
        color: var(--primary-color);
        background: none;
        border: none;
        font: inherit;
        padding: 0;
      }
      .occ-meta {
        font-size: 0.8rem;
        color: var(--secondary-text-color);
      }
      .occ-assignments {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }
      .assignment-chip {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-size: 0.82rem;
        border: 1px solid var(--divider-color);
        border-radius: 14px;
        padding: 4px 10px;
      }
    `,
  ];

  private async _toggleMaster(): Promise<void> {
    this._busy = true;
    this.requestUpdate();
    try {
      await saveConfig(this.hass, this.entryId, {
        enabled: !this.snapshot.config.enabled,
      });
    } catch (e) {
      this._error = formatApiError(e, this.hass);
    } finally {
      this._busy = false;
      this.requestUpdate();
    }
  }

  private async _recalculate(): Promise<void> {
    this._busy = true;
    this.requestUpdate();
    try {
      await recalculate(this.hass, this.entryId);
      this._error = undefined;
    } catch (e) {
      this._error = formatApiError(e, this.hass);
    } finally {
      this._busy = false;
      this.requestUpdate();
    }
  }

  private _openScenario(scenarioId: string): void {
    navigate(
      this,
      `${exportPath(this.entryId, "scenarios")}?editScenario=${scenarioId}`
    );
  }

  private _renderTrack() {
    const occs = this.snapshot.plan;
    const nowMin = minutesOfDay(this.snapshot.now) ?? 0;
    return html`
      <div class="track-wrap">
        <div class="track">
          <div class="hour-grid">
            ${Array.from({ length: 24 }, () => html`<span></span>`)}
          </div>
          <div class="now-line" style="left:${(nowMin / 1440) * 100}%"></div>
          ${occs.map((occ) => {
            const m = minutesOfDay(occ.planned_at);
            if (m == null) return nothing;
            const worst = occ.assignments.length
              ? runBadge(occ, occ.assignments[0])
              : "planned";
            return html`
              <div
                class="dot ${worst}"
                style="left:${(m / 1440) * 100}%"
                title="${formatTime(occ.planned_at)} · ${occ.scenario_name}"
                @click=${() => this._openScenario(occ.scenario_id)}
              ></div>
            `;
          })}
        </div>
        <div class="axis">
          <span>0:00</span><span>6:00</span><span>12:00</span><span>18:00</span
          ><span>24:00</span>
        </div>
      </div>
    `;
  }

  private _renderOccurrence(occ: Occurrence) {
    return html`
      <div class="occ">
        <div class="occ-head">
          <span class="occ-time">${formatTime(occ.planned_at)}</span>
          <button class="occ-name" @click=${() => this._openScenario(occ.scenario_id)}>
            ${occ.scenario_name}
          </button>
          ${occ.random_offset_min
            ? html`<span class="occ-meta"
                >${t(this.hass, "config_panel.today_random_offset", {
                  n: occ.random_offset_min,
                })}</span
              >`
            : nothing}
          ${occ.retry_until
            ? html`<span class="occ-meta"
                >${t(this.hass, "config_panel.today_retry_until", {
                  time: formatTime(occ.retry_until),
                })}</span
              >`
            : nothing}
        </div>
        <div class="occ-assignments">
          ${occ.assignments.map((run) => {
            const badge = runBadge(occ, run);
            const title = run.reason ?? "";
            return html`
              <span class="assignment-chip" title=${title}>
                ${run.cover_name} → ${run.target_position}%
                <span class="badge badge-${badge}"
                  >${t(this.hass, `config_panel.status_${badge}`)}</span
                >
                ${run.status === "armed" && run.armed_until
                  ? html`<span class="occ-meta"
                      >⏳ ${formatTime(run.armed_until)}</span
                    >`
                  : nothing}
              </span>
            `;
          })}
          ${!occ.assignments.length
            ? html`<span class="muted"
                >${t(this.hass, "config_panel.today_no_assignments")}</span
              >`
            : nothing}
        </div>
      </div>
    `;
  }

  protected render() {
    const snap = this.snapshot;
    if (!snap) return nothing;
    return html`
      <ha-card>
        <div class="card-header">
          <ha-icon icon="mdi:calendar-clock"></ha-icon>
          ${t(this.hass, "config_panel.today_title")}
          <span class="header-actions">
            <span class="sun">
              ☀︎↑ ${formatTime(snap.sun.sunrise)} · ☀︎↓ ${formatTime(snap.sun.sunset)}
            </span>
            <button
              type="button"
              class="btn-outline"
              .disabled=${this._busy}
              @click=${this._recalculate}
            >
              ${t(this.hass, "config_panel.today_recalculate")}
            </button>
          </span>
        </div>
        <div class="card-content">
          <div class="head-row">
            <label class="master">
              <ha-switch
                .checked=${snap.config.enabled}
                .disabled=${this._busy}
                @click=${this._toggleMaster}
              ></ha-switch>
              ${t(this.hass, "config_panel.today_master")}
            </label>
          </div>
          ${this._error ? html`<p class="error">${this._error}</p>` : nothing}
          ${!snap.config.enabled
            ? html`<p class="warning">
                ${t(this.hass, "config_panel.today_master_off_hint")}
              </p>`
            : nothing}
          ${this._renderTrack()}
        </div>
      </ha-card>
      <ha-card>
        <div class="card-header">
          <ha-icon icon="mdi:format-list-bulleted"></ha-icon>
          ${t(this.hass, "config_panel.today_plan_title")}
        </div>
        <div class="card-content">
          <p class="intro">${t(this.hass, "config_panel.today_intro")}</p>
          ${renderHelp(this.hass, "today_statuses")}
          ${snap.plan.length
            ? snap.plan.map((occ) => this._renderOccurrence(occ))
            : html`<div class="empty-state">
                <ha-icon icon="mdi:calendar-blank-outline"></ha-icon>
                <p>
                  ${snap.scenarios.length
                    ? t(this.hass, "config_panel.today_empty_nothing_planned")
                    : t(this.hass, "config_panel.today_empty_no_scenarios")}
                </p>
              </div>`}
        </div>
      </ha-card>
    `;
  }
}

defineCustomElementOnce("ac-view-today", ViewToday);
