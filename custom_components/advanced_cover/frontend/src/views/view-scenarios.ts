import { LitElement, css, html, nothing } from "lit";
import { COMPASS, nearestCompassDeg } from "../compass";
import { renderConditionEditor } from "../condition-editor";
import {
  deleteScenario,
  reorderScenarios,
  runScenario,
  saveScenario,
} from "../data/api";
import { renderEntityDatalist } from "../entity-input";
import { defineCustomElementOnce, formatApiError, formatTime } from "../helpers";
import { renderHelp } from "../help";
import { t } from "../i18n";
import { stripEditScenarioQueryFromUrl } from "../navigation";
import { sharedStyles } from "../styles";
import type {
  ActionOverride,
  Assignment,
  CoverRuntime,
  HomeAssistant,
  PanelSnapshot,
  Scenario,
} from "../types";

const WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const RANDOM_WINDOWS = [0, 15, 30, 60];
const RETRY_WINDOWS = [0, 60, 120, 240, 480];

function emptyScenario(): Scenario {
  return {
    id: "",
    name: "",
    enabled: true,
    trigger: { type: "fixed_time", time_local: "07:00", sun_event: "sunset", offset_min: 0 },
    random_window_min: 0,
    random_direction: "both",
    weekdays: [...WEEKDAYS],
    conditions: [],
    retry_window_min: 0,
    action: { position: 0, tilt_position: null, mode: "normal", min_position_delta: null },
    assignments: [],
  };
}

function emptyOverride(): ActionOverride {
  return { position: null, tilt_position: null, mode: null, min_position_delta: null };
}

export class ViewScenarios extends LitElement {
  static properties = {
    hass: { attribute: false },
    entryId: { type: String },
    snapshot: { attribute: false },
    editScenarioId: { type: String },
  };

  hass!: HomeAssistant;
  entryId!: string;
  snapshot!: PanelSnapshot;
  /** Deep link: open this scenario's editor once (from ?editScenario=). */
  editScenarioId?: string;

  private _error?: string;
  private _warnings: string[] = [];
  private _busy = false;
  private _draft: Scenario | null = null;
  private _runIgnoreConditions = false;
  private _openedDeepLink?: string;

  static styles = [
    sharedStyles,
    css`
      .order-buttons {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .order-buttons button {
        padding: 2px 8px;
        line-height: 1;
      }
      .seg {
        display: inline-flex;
        border: 1px solid var(--divider-color);
        border-radius: 8px;
        overflow: hidden;
      }
      .seg button {
        font: inherit;
        font-size: 0.875rem;
        border: none;
        background: transparent;
        color: var(--primary-text-color);
        padding: 8px 14px;
        cursor: pointer;
      }
      .seg button.selected {
        background: var(--primary-color);
        color: var(--text-primary-color, #fff);
      }
      .assignment-box {
        border: 1px solid var(--divider-color);
        border-radius: 8px;
        padding: 10px 12px;
        margin-bottom: 8px;
      }
      .assignment-head {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
      }
      .assignment-head .name {
        font-weight: 600;
        flex: 1;
        min-width: 120px;
      }
      .slider-row {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .slider-row input[type="number"] {
        width: 76px;
      }
      .quick-add {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 6px 8px;
        margin-bottom: 10px;
      }
      .quick-add-label {
        font-size: 0.8rem;
        font-weight: 600;
        color: var(--secondary-text-color);
      }
      .quick-add-group {
        display: inline-flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 6px;
        padding-left: 8px;
        border-left: 1px solid var(--divider-color);
      }
      .quick-add-sub {
        font-size: 0.76rem;
        color: var(--secondary-text-color);
      }
      .quick-add .chip {
        white-space: nowrap;
      }
    `,
  ];

  protected updated(): void {
    if (
      this.editScenarioId &&
      this._openedDeepLink !== this.editScenarioId &&
      this.snapshot
    ) {
      const scenario = this.snapshot.scenarios.find(
        (s) => s.id === this.editScenarioId
      );
      this._openedDeepLink = this.editScenarioId;
      stripEditScenarioQueryFromUrl();
      if (scenario) {
        this._openEdit(scenario);
      }
    }
  }

  // ------------------------------------------------------------------ helpers

  private _coverName(coverItemId: string): string {
    return (
      this.snapshot.covers.find((c) => c.id === coverItemId)?.name ?? coverItemId
    );
  }

  private _areaName(areaId: string): string {
    return this.hass.areas?.[areaId]?.name ?? areaId;
  }

  private _triggerSummary(s: Scenario): string {
    const trig =
      s.trigger.type === "fixed_time"
        ? (s.trigger.time_local ?? "")
        : `${t(this.hass, `config_panel.sun_${s.trigger.sun_event}`)}${
            s.trigger.offset_min
              ? ` ${s.trigger.offset_min > 0 ? "+" : ""}${s.trigger.offset_min} min`
              : ""
          }`;
    const random = s.random_window_min
      ? ` ± ${s.random_window_min} min`
      : "";
    const days =
      s.weekdays.length === 7
        ? t(this.hass, "config_panel.weekdays_all")
        : s.weekdays
            .map((d) => t(this.hass, `config_panel.weekday_${d}`))
            .join(" ");
    return `${trig}${random} · ${days}`;
  }

  private _todayTime(s: Scenario): string | null {
    const occ = this.snapshot.plan.find((o) => o.scenario_id === s.id);
    return occ ? formatTime(occ.planned_at) : null;
  }

  private _patch(patch: Partial<Scenario>): void {
    if (!this._draft) return;
    this._draft = { ...this._draft, ...patch };
    this.requestUpdate();
  }

  // ------------------------------------------------------------------ actions

  private _openAdd(): void {
    this._draft = emptyScenario();
    this._error = undefined;
    this._warnings = [];
    this.requestUpdate();
  }

  private _openEdit(scenario: Scenario): void {
    this._draft = JSON.parse(JSON.stringify(scenario)) as Scenario;
    this._error = undefined;
    this._warnings = scenario.warnings ?? [];
    this.requestUpdate();
  }

  private _duplicate(scenario: Scenario): void {
    const copy = JSON.parse(JSON.stringify(scenario)) as Scenario;
    copy.id = "";
    copy.name = `${copy.name} (copy)`;
    this._draft = copy;
    this._error = undefined;
    this._warnings = [];
    this.requestUpdate();
  }

  private async _save(): Promise<void> {
    if (!this._draft) return;
    if (!this._draft.name.trim()) {
      this._error = t(this.hass, "config_panel.scenarios_err_name_required");
      this.requestUpdate();
      return;
    }
    this._busy = true;
    this.requestUpdate();
    try {
      const res = await saveScenario(this.hass, this.entryId, this._draft);
      if (res.warnings?.length) {
        this._warnings = res.warnings;
        this._draft = { ...this._draft, id: res.id };
      } else {
        this._draft = null;
        this._warnings = [];
      }
      this._error = undefined;
    } catch (e) {
      this._error = formatApiError(e, this.hass);
    } finally {
      this._busy = false;
      this.requestUpdate();
    }
  }

  private async _delete(scenario: Scenario): Promise<void> {
    if (
      !window.confirm(
        t(this.hass, "config_panel.scenarios_delete_confirm", {
          name: scenario.name,
        })
      )
    ) {
      return;
    }
    try {
      await deleteScenario(this.hass, this.entryId, scenario.id);
      if (this._draft?.id === scenario.id) this._draft = null;
    } catch (e) {
      this._error = formatApiError(e, this.hass);
    }
    this.requestUpdate();
  }

  private async _toggleEnabled(scenario: Scenario): Promise<void> {
    try {
      const { warnings, ...payload } = scenario;
      await saveScenario(this.hass, this.entryId, {
        ...payload,
        enabled: !scenario.enabled,
      });
    } catch (e) {
      this._error = formatApiError(e, this.hass);
      this.requestUpdate();
    }
  }

  private async _move(scenario: Scenario, delta: number): Promise<void> {
    const ids = this.snapshot.scenarios.map((s) => s.id);
    const idx = ids.indexOf(scenario.id);
    const target = idx + delta;
    if (idx < 0 || target < 0 || target >= ids.length) return;
    [ids[idx], ids[target]] = [ids[target], ids[idx]];
    try {
      await reorderScenarios(this.hass, this.entryId, ids);
    } catch (e) {
      this._error = formatApiError(e, this.hass);
      this.requestUpdate();
    }
  }

  private async _runNow(scenarioId: string): Promise<void> {
    this._busy = true;
    this.requestUpdate();
    try {
      await runScenario(this.hass, this.entryId, scenarioId, {
        ignoreConditions: this._runIgnoreConditions,
      });
      this._error = undefined;
    } catch (e) {
      this._error = formatApiError(e, this.hass);
    } finally {
      this._busy = false;
      this.requestUpdate();
    }
  }

  // ---------------------------------------------------------------- rendering

  private _renderRow(scenario: Scenario, index: number, total: number) {
    const today = this._todayTime(scenario);
    return html`
      <div class="list-row-wrap">
        <div class="list-row-accent ${scenario.enabled ? "" : "inactive"}"></div>
        <div class="list-row">
          <div class="order-buttons">
            <button class="btn-icon" .disabled=${index === 0}
              title=${t(this.hass, "config_panel.scenarios_move_up")}
              @click=${() => this._move(scenario, -1)}>▲</button>
            <button class="btn-icon" .disabled=${index === total - 1}
              title=${t(this.hass, "config_panel.scenarios_move_down")}
              @click=${() => this._move(scenario, 1)}>▼</button>
          </div>
          <ha-switch
            .checked=${scenario.enabled}
            @click=${() => this._toggleEnabled(scenario)}
          ></ha-switch>
          <div class="list-main">
            <p class="list-name">${scenario.name}</p>
            <p class="list-detail">
              ${this._triggerSummary(scenario)} ·
              ${t(this.hass, "config_panel.scenarios_covers_count", {
                n: scenario.assignments.length,
              })}
              ${today
                ? html` · ${t(this.hass, "config_panel.scenarios_today_at", {
                    time: today,
                  })}`
                : nothing}
              → ${scenario.action.position}%
            </p>
            ${scenario.warnings?.length
              ? html`<p class="warning">⚠ ${scenario.warnings.join(" · ")}</p>`
              : nothing}
          </div>
          <div class="list-actions">
            <button class="btn-outline" @click=${() => this._openEdit(scenario)}>
              ${t(this.hass, "config_panel.scenarios_edit")}
            </button>
            <button class="btn-danger" @click=${() => this._delete(scenario)}>
              ${t(this.hass, "config_panel.scenarios_delete")}
            </button>
          </div>
        </div>
      </div>
    `;
  }

  private _renderWhenSection(draft: Scenario) {
    return html`
      <div class="section-title">${t(this.hass, "config_panel.scenarios_when")}</div>
      <div class="row">
        <div class="seg">
          <button
            type="button"
            class=${draft.trigger.type === "fixed_time" ? "selected" : ""}
            @click=${() =>
              this._patch({ trigger: { ...draft.trigger, type: "fixed_time" } })}
          >
            ${t(this.hass, "config_panel.trigger_fixed_time")}
          </button>
          <button
            type="button"
            class=${draft.trigger.type === "sun_event" ? "selected" : ""}
            @click=${() =>
              this._patch({ trigger: { ...draft.trigger, type: "sun_event" } })}
          >
            ${t(this.hass, "config_panel.trigger_sun")}
          </button>
        </div>
        ${draft.trigger.type === "fixed_time"
          ? html`
              <input
                type="time"
                style="width:auto"
                .value=${draft.trigger.time_local ?? "07:00"}
                @input=${(e: Event) =>
                  this._patch({
                    trigger: {
                      ...draft.trigger,
                      time_local: (e.target as HTMLInputElement).value,
                    },
                  })}
              />
            `
          : html`
              <select
                style="width:auto"
                .value=${draft.trigger.sun_event ?? "sunset"}
                @change=${(e: Event) =>
                  this._patch({
                    trigger: {
                      ...draft.trigger,
                      sun_event: (e.target as HTMLSelectElement)
                        .value as Scenario["trigger"]["sun_event"],
                    },
                  })}
              >
                ${["sunrise", "sunset", "solar_noon"].map(
                  (ev) => html`
                    <option value=${ev} ?selected=${draft.trigger.sun_event === ev}>
                      ${t(this.hass, `config_panel.sun_${ev}`)}
                    </option>
                  `
                )}
              </select>
              <div>
                <label class="field-label">${t(this.hass, "config_panel.scenarios_offset_min")}</label>
                <input
                  type="number"
                  min="-720"
                  max="720"
                  style="width:90px"
                  .value=${String(draft.trigger.offset_min ?? 0)}
                  @input=${(e: Event) =>
                    this._patch({
                      trigger: {
                        ...draft.trigger,
                        offset_min: Number((e.target as HTMLInputElement).value),
                      },
                    })}
                />
              </div>
            `}
      </div>

      <label class="field-label">${t(this.hass, "config_panel.scenarios_random")}</label>
      ${renderHelp(this.hass, "random")}
      <div class="row">
        <span class="chips">
          ${RANDOM_WINDOWS.map(
            (w) => html`
              <button
                type="button"
                class="chip ${draft.random_window_min === w ? "selected" : ""}"
                @click=${() => this._patch({ random_window_min: w })}
              >
                ${w === 0 ? t(this.hass, "config_panel.off") : `${w} min`}
              </button>
            `
          )}
        </span>
        ${draft.random_window_min
          ? html`
              <select
                style="width:auto"
                .value=${draft.random_direction}
                @change=${(e: Event) =>
                  this._patch({
                    random_direction: (e.target as HTMLSelectElement)
                      .value as Scenario["random_direction"],
                  })}
              >
                ${(["after", "before", "both"] as const).map(
                  (d) => html`
                    <option value=${d} ?selected=${draft.random_direction === d}>
                      ${t(this.hass, `config_panel.random_${d}`)}
                    </option>
                  `
                )}
              </select>
            `
          : nothing}
      </div>

      <label class="field-label">${t(this.hass, "config_panel.scenarios_weekdays")}</label>
      <div class="chips" style="margin-bottom:12px">
        ${WEEKDAYS.map((d) => {
          const selected = draft.weekdays.includes(d);
          return html`
            <button
              type="button"
              class="chip ${selected ? "selected" : ""}"
              @click=${() =>
                this._patch({
                  weekdays: selected
                    ? draft.weekdays.filter((x) => x !== d)
                    : [...draft.weekdays, d],
                })}
            >
              ${t(this.hass, `config_panel.weekday_${d}`)}
            </button>
          `;
        })}
      </div>

      <label class="field-label">${t(this.hass, "config_panel.scenarios_retry")}</label>
      <div class="chips" style="margin-bottom:4px">
        ${RETRY_WINDOWS.map(
          (w) => html`
            <button
              type="button"
              class="chip ${draft.retry_window_min === w ? "selected" : ""}"
              @click=${() => this._patch({ retry_window_min: w })}
            >
              ${w === 0
                ? t(this.hass, "config_panel.off")
                : w < 120
                  ? `${w} min`
                  : `${w / 60} h`}
            </button>
          `
        )}
      </div>
      <p class="section-desc">${t(this.hass, "config_panel.scenarios_retry_hint")}</p>
      ${renderHelp(this.hass, "retry")}
    `;
  }

  private _renderThenSection(draft: Scenario) {
    const anyTilt = draft.assignments.some(
      (a) =>
        this.snapshot.covers.find((c) => c.id === a.cover_item_id)?.capabilities
          .supports_tilt
    );
    return html`
      <div class="section-title">${t(this.hass, "config_panel.scenarios_then")}</div>
      <div class="slider-row">
        <span class="muted">${t(this.hass, "config_panel.scenarios_position")}</span>
        <input
          type="range"
          min="0"
          max="100"
          step="1"
          .value=${String(draft.action.position)}
          @input=${(e: Event) =>
            this._patch({
              action: {
                ...draft.action,
                position: Number((e.target as HTMLInputElement).value),
              },
            })}
        />
        <input
          type="number"
          min="0"
          max="100"
          .value=${String(draft.action.position)}
          @input=${(e: Event) =>
            this._patch({
              action: {
                ...draft.action,
                position: Number((e.target as HTMLInputElement).value),
              },
            })}
        />
        <span class="muted">%</span>
      </div>
      <p class="section-desc">${t(this.hass, "config_panel.scenarios_position_hint")}</p>
      ${anyTilt
        ? html`
            <div class="slider-row">
              <span class="muted">${t(this.hass, "config_panel.scenarios_tilt")}</span>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                .value=${String(draft.action.tilt_position ?? 0)}
                .disabled=${draft.action.tilt_position == null}
                @input=${(e: Event) =>
                  this._patch({
                    action: {
                      ...draft.action,
                      tilt_position: Number((e.target as HTMLInputElement).value),
                    },
                  })}
              />
              <label class="checkbox-row" style="margin:0">
                <input
                  type="checkbox"
                  .checked=${draft.action.tilt_position != null}
                  @change=${(e: Event) =>
                    this._patch({
                      action: {
                        ...draft.action,
                        tilt_position: (e.target as HTMLInputElement).checked
                          ? 50
                          : null,
                      },
                    })}
                />
                ${draft.action.tilt_position != null
                  ? `${draft.action.tilt_position}%`
                  : t(this.hass, "config_panel.off")}
              </label>
            </div>
          `
        : nothing}
      <div class="row" style="margin-top:8px">
        <div>
          <label class="field-label">${t(this.hass, "config_panel.scenarios_mode")}</label>
          <select
            style="width:auto"
            .value=${draft.action.mode}
            @change=${(e: Event) =>
              this._patch({
                action: {
                  ...draft.action,
                  mode: (e.target as HTMLSelectElement).value as "normal" | "low",
                },
              })}
          >
            <option value="normal" ?selected=${draft.action.mode === "normal"}>
              ${t(this.hass, "config_panel.mode_normal")}
            </option>
            <option value="low" ?selected=${draft.action.mode === "low"}>
              ${t(this.hass, "config_panel.mode_low")}
            </option>
          </select>
        </div>
      </div>
      ${renderHelp(this.hass, "mode_low")}
      <details class="expand">
        <summary>${t(this.hass, "config_panel.scenarios_advanced")}</summary>
        <div class="row" style="margin-top:8px">
          <div>
            <label class="field-label">${t(this.hass, "config_panel.scenarios_min_delta")}</label>
            <input
              type="number"
              min="0"
              max="100"
              style="width:90px"
              placeholder=${String(this.snapshot.config.default_min_position_delta)}
              .value=${draft.action.min_position_delta == null
                ? ""
                : String(draft.action.min_position_delta)}
              @input=${(e: Event) => {
                const raw = (e.target as HTMLInputElement).value;
                this._patch({
                  action: {
                    ...draft.action,
                    min_position_delta: raw === "" ? null : Number(raw),
                  },
                });
              }}
            />
          </div>
        </div>
        <p class="section-desc">${t(this.hass, "config_panel.scenarios_min_delta_hint")}</p>
        ${renderHelp(this.hass, "min_delta")}
      </details>
    `;
  }

  private _patchAssignment(index: number, patch: Partial<Assignment>): void {
    if (!this._draft) return;
    const assignments = this._draft.assignments.map((a, i) =>
      i === index ? { ...a, ...patch } : a
    );
    this._patch({ assignments });
  }

  /** Append the given covers as assignments, skipping already-assigned ones. */
  private _addCovers(covers: CoverRuntime[]): void {
    if (!this._draft || !covers.length) return;
    const assigned = new Set(this._draft.assignments.map((a) => a.cover_item_id));
    const additions: Assignment[] = covers
      .filter((c) => !assigned.has(c.id))
      .map((c) => ({
        cover_item_id: c.id,
        extra_conditions: [],
        action_override: null,
      }));
    if (!additions.length) return;
    this._patch({ assignments: [...this._draft.assignments, ...additions] });
  }

  private _renderAssignment(draft: Scenario, assignment: Assignment, index: number) {
    const cover = this.snapshot.covers.find((c) => c.id === assignment.cover_item_id);
    const ov = assignment.action_override ?? emptyOverride();
    const hasOverride =
      ov.position != null || ov.tilt_position != null || ov.mode != null;
    return html`
      <div class="assignment-box">
        <div class="assignment-head">
          <span class="name">${this._coverName(assignment.cover_item_id)}</span>
          ${assignment.extra_conditions.length
            ? html`<span class="badge">${t(
                this.hass,
                "config_panel.scenarios_extra_conditions_badge",
                { n: assignment.extra_conditions.length }
              )}</span>`
            : nothing}
          ${hasOverride
            ? html`<span class="badge">${t(
                this.hass,
                "config_panel.scenarios_override_badge"
              )}</span>`
            : nothing}
          <button
            class="cond-remove"
            title=${t(this.hass, "config_panel.scenarios_remove_cover")}
            @click=${() =>
              this._patch({
                assignments: draft.assignments.filter((_, i) => i !== index),
              })}
          >
            ✕
          </button>
        </div>
        <details class="expand">
          <summary>${t(this.hass, "config_panel.scenarios_assignment_details")}</summary>
          <div class="section-title">
            ${t(this.hass, "config_panel.scenarios_extra_conditions")}
          </div>
          <p class="section-desc">
            ${t(this.hass, "config_panel.scenarios_extra_conditions_desc")}
          </p>
          ${renderConditionEditor({
            hass: this.hass,
            conditions: assignment.extra_conditions,
            onChange: (conds) =>
              this._patchAssignment(index, { extra_conditions: conds }),
            entityListId: "ac-all-entities",
            contactAvailable: Boolean(cover?.contact_entity_id),
          })}
          <div class="section-title">
            ${t(this.hass, "config_panel.scenarios_override")}
          </div>
          ${renderHelp(this.hass, "override")}
          <div class="row">
            <div>
              <label class="field-label">${t(this.hass, "config_panel.scenarios_position")}</label>
              <input
                type="number"
                min="0"
                max="100"
                style="width:90px"
                placeholder=${String(draft.action.position)}
                .value=${ov.position == null ? "" : String(ov.position)}
                @input=${(e: Event) => {
                  const raw = (e.target as HTMLInputElement).value;
                  this._patchAssignment(index, {
                    action_override: {
                      ...ov,
                      position: raw === "" ? null : Number(raw),
                    },
                  });
                }}
              />
            </div>
            ${cover?.capabilities.supports_tilt
              ? html`
                  <div>
                    <label class="field-label">${t(this.hass, "config_panel.scenarios_tilt")}</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      style="width:90px"
                      .value=${ov.tilt_position == null ? "" : String(ov.tilt_position)}
                      @input=${(e: Event) => {
                        const raw = (e.target as HTMLInputElement).value;
                        this._patchAssignment(index, {
                          action_override: {
                            ...ov,
                            tilt_position: raw === "" ? null : Number(raw),
                          },
                        });
                      }}
                    />
                  </div>
                `
              : nothing}
            <div>
              <label class="field-label">${t(this.hass, "config_panel.scenarios_mode")}</label>
              <select
                style="width:auto"
                @change=${(e: Event) => {
                  const value = (e.target as HTMLSelectElement).value;
                  this._patchAssignment(index, {
                    action_override: {
                      ...ov,
                      mode: value === "" ? null : (value as "normal" | "low"),
                    },
                  });
                }}
              >
                <option value="" ?selected=${ov.mode == null}>
                  ${t(this.hass, "config_panel.scenarios_inherit")}
                </option>
                <option value="normal" ?selected=${ov.mode === "normal"}>
                  ${t(this.hass, "config_panel.mode_normal")}
                </option>
                <option value="low" ?selected=${ov.mode === "low"}>
                  ${t(this.hass, "config_panel.mode_low")}
                </option>
              </select>
            </div>
          </div>
        </details>
      </div>
    `;
  }

  private _renderQuickAdd(addable: CoverRuntime[]) {
    if (!addable.length) return nothing;
    // Direction buckets: nearest-of-8 compass point per cover azimuth.
    const byDir = new Map<number, CoverRuntime[]>();
    for (const c of addable) {
      if (c.azimuth == null) continue;
      const deg = nearestCompassDeg(c.azimuth);
      (byDir.get(deg) ?? byDir.set(deg, []).get(deg)!).push(c);
    }
    // Room buckets, sorted by area name.
    const byArea = new Map<string, CoverRuntime[]>();
    for (const c of addable) {
      if (!c.area_id) continue;
      (byArea.get(c.area_id) ?? byArea.set(c.area_id, []).get(c.area_id)!).push(c);
    }
    const areas = [...byArea.entries()]
      .map(([id, covers]) => ({ id, name: this._areaName(id), covers }))
      .sort((a, b) => a.name.localeCompare(b.name));
    const anyDir = [...byDir.values()].some((v) => v.length);
    return html`
      <div class="quick-add">
        <span class="quick-add-label"
          >${t(this.hass, "config_panel.scenarios_quick_add")}</span
        >
        <button
          type="button"
          class="chip"
          @click=${() => this._addCovers(addable)}
        >
          ＋ ${t(this.hass, "config_panel.scenarios_quick_add_all", {
            n: addable.length,
          })}
        </button>
        ${anyDir
          ? html`<span class="quick-add-group">
              <span class="quick-add-sub"
                >${t(this.hass, "config_panel.scenarios_quick_add_direction")}</span
              >
              ${COMPASS.map(([label, deg]) => {
                const covers = byDir.get(deg) ?? [];
                return covers.length
                  ? html`<button
                      type="button"
                      class="chip"
                      title=${t(this.hass, "config_panel.scenarios_quick_add_direction_title", {
                        label,
                        n: covers.length,
                      })}
                      @click=${() => this._addCovers(covers)}
                    >
                      🧭 ${label} ·${covers.length}
                    </button>`
                  : nothing;
              })}
            </span>`
          : nothing}
        ${areas.length
          ? html`<span class="quick-add-group">
              <span class="quick-add-sub"
                >${t(this.hass, "config_panel.scenarios_quick_add_room")}</span
              >
              ${areas.map(
                (a) => html`<button
                  type="button"
                  class="chip"
                  @click=${() => this._addCovers(a.covers)}
                >
                  📍 ${a.name} ·${a.covers.length}
                </button>`
              )}
            </span>`
          : nothing}
      </div>
    `;
  }

  private _renderCoversSection(draft: Scenario) {
    const assignedIds = new Set(draft.assignments.map((a) => a.cover_item_id));
    const addable = this.snapshot.covers.filter((c) => !assignedIds.has(c.id));
    return html`
      <div class="section-title">${t(this.hass, "config_panel.scenarios_covers")}</div>
      ${renderHelp(this.hass, "assignments")}
      ${this._renderQuickAdd(addable)}
      ${draft.assignments.map((a, i) => this._renderAssignment(draft, a, i))}
      ${addable.length
        ? html`
            <select
              @change=${(e: Event) => {
                const sel = e.target as HTMLSelectElement;
                if (!sel.value) return;
                this._patch({
                  assignments: [
                    ...draft.assignments,
                    {
                      cover_item_id: sel.value,
                      extra_conditions: [],
                      action_override: null,
                    },
                  ],
                });
                sel.value = "";
              }}
            >
              <option value="">
                ＋ ${t(this.hass, "config_panel.scenarios_add_cover")}
              </option>
              ${addable.map(
                (c) => html`<option value=${c.id}>${c.name}</option>`
              )}
            </select>
          `
        : nothing}
      ${!this.snapshot.covers.length
        ? html`<p class="muted">${t(this.hass, "config_panel.scenarios_no_covers_hint")}</p>`
        : nothing}
    `;
  }

  private _renderDialog() {
    const draft = this._draft;
    if (!draft) return nothing;
    return html`
      <div class="dialog-backdrop" @click=${(e: Event) => {
        if (e.target === e.currentTarget) {
          this._draft = null;
          this.requestUpdate();
        }
      }}>
        <div class="dialog" style="max-width:760px">
          <h3>
            ${draft.id
              ? t(this.hass, "config_panel.scenarios_dialog_edit", { name: draft.name })
              : t(this.hass, "config_panel.scenarios_dialog_new")}
          </h3>
          ${this._error ? html`<p class="error">${this._error}</p>` : nothing}
          ${this._warnings.map((w) => html`<p class="warning">⚠ ${w}</p>`)}

          ${renderEntityDatalist(
            this.hass,
            "ac-all-entities",
            null,
            this.snapshot.config.favorite_entity_ids
          )}

          <div class="row">
            <div class="grow">
              <label class="field-label">${t(this.hass, "config_panel.scenarios_field_name")}</label>
              <input
                type="text"
                .value=${draft.name}
                @input=${(e: Event) =>
                  this._patch({ name: (e.target as HTMLInputElement).value })}
              />
            </div>
            <label class="checkbox-row" style="margin:0 0 6px">
              <input
                type="checkbox"
                .checked=${draft.enabled}
                @change=${(e: Event) =>
                  this._patch({ enabled: (e.target as HTMLInputElement).checked })}
              />
              ${t(this.hass, "config_panel.scenarios_enabled")}
            </label>
          </div>

          ${this._renderWhenSection(draft)}

          <div class="section-title">${t(this.hass, "config_panel.scenarios_only_if")}</div>
          <p class="section-desc">
            ${t(this.hass, "config_panel.scenarios_only_if_desc")}
          </p>
          ${renderConditionEditor({
            hass: this.hass,
            conditions: draft.conditions,
            onChange: (conds) => this._patch({ conditions: conds }),
            entityListId: "ac-all-entities",
            contactAvailable: draft.assignments.some((a) =>
              Boolean(
                this.snapshot.covers.find((c) => c.id === a.cover_item_id)
                  ?.contact_entity_id
              )
            ),
          })}

          ${this._renderThenSection(draft)}
          ${this._renderCoversSection(draft)}

          <div class="dialog-actions">
            ${draft.id
              ? html`
                  <label class="checkbox-row" style="margin:0">
                    <input
                      type="checkbox"
                      .checked=${this._runIgnoreConditions}
                      @change=${(e: Event) => {
                        this._runIgnoreConditions = (
                          e.target as HTMLInputElement
                        ).checked;
                      }}
                    />
                    ${t(this.hass, "config_panel.scenarios_run_ignore")}
                  </label>
                  <button
                    class="btn-outline"
                    .disabled=${this._busy}
                    @click=${() => this._runNow(draft.id)}
                  >
                    ${t(this.hass, "config_panel.scenarios_run_now")}
                  </button>
                `
              : nothing}
            <span class="spacer"></span>
            <button
              class="btn-outline"
              @click=${() => {
                this._draft = null;
                this.requestUpdate();
              }}
            >
              ${t(this.hass, "config_panel.cancel")}
            </button>
            <button class="btn" .disabled=${this._busy} @click=${this._save}>
              ${this._busy
                ? t(this.hass, "config_panel.saving")
                : t(this.hass, "config_panel.save")}
            </button>
          </div>
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
          <ha-icon icon="mdi:script-text-outline"></ha-icon>
          ${t(this.hass, "config_panel.scenarios_title")}
          <span class="header-actions">
            <button class="btn" @click=${this._openAdd}>
              ＋ ${t(this.hass, "config_panel.scenarios_add")}
            </button>
          </span>
        </div>
        <div class="card-content">
          <p class="intro">${t(this.hass, "config_panel.scenarios_intro")}</p>
          ${renderHelp(this.hass, "priority")}
          ${this._error && !this._draft
            ? html`<p class="error">${this._error}</p>`
            : nothing}
          ${snap.scenarios.length
            ? snap.scenarios.map((s, i) =>
                this._renderRow(s, i, snap.scenarios.length)
              )
            : html`<div class="empty-state">
                <ha-icon icon="mdi:script-text-outline"></ha-icon>
                <p>${t(this.hass, "config_panel.scenarios_empty")}</p>
              </div>`}
        </div>
      </ha-card>
      ${this._renderDialog()}
    `;
  }
}

defineCustomElementOnce("ac-view-scenarios", ViewScenarios);
