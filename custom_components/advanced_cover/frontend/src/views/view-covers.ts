import { LitElement, css, html, nothing } from "lit";
import { COMPASS, formatAzimuth } from "../compass";
import { deleteCover, probeCover, saveCover, testCover } from "../data/api";
import { renderEntityDatalist } from "../entity-input";
import { defineCustomElementOnce, formatApiError, formatTime } from "../helpers";
import { renderHelp } from "../help";
import { t } from "../i18n";
import { sharedStyles } from "../styles";
import type {
  CoverCapabilities,
  CoverItem,
  CoverRuntime,
  HomeAssistant,
  PanelSnapshot,
} from "../types";

const KINDS = ["shutter", "blind", "awning", "curtain", "shade", "other"];
const KIND_ICONS: Record<string, string> = {
  shutter: "mdi:window-shutter",
  blind: "mdi:blinds-horizontal",
  awning: "mdi:awning-outline",
  curtain: "mdi:curtains",
  shade: "mdi:roller-shade",
  other: "mdi:window-closed-variant",
};
const CONTACT_ICONS: Record<string, string> = {
  closed: "mdi:window-closed",
  tilted: "mdi:window-open",
  open: "mdi:window-open-variant",
  unknown: "mdi:help-circle-outline",
};

function emptyDraft(): CoverItem {
  return {
    id: "",
    name: "",
    cover_entity_id: "",
    kind: "shutter",
    area_id: null,
    azimuth: null,
    low_mode_entity_id: null,
    low_mode_script_id: null,
    contact_entity_id: null,
    contact_state_map: {},
    safety: { ventilation_position: 20, mode: "block", block_when_tilted: false },
    enabled: true,
  };
}

export class ViewCovers extends LitElement {
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
  private _draft: CoverItem | null = null;
  private _draftCaps: CoverCapabilities | null = null;
  private _testPosition: Record<string, number> = {};

  static styles = [
    sharedStyles,
    css`
      .cover-badges {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
        font-size: 0.82rem;
        color: var(--secondary-text-color);
      }
      .cover-badges ha-icon {
        --mdc-icon-size: 17px;
      }
      .pos-wrap {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 130px;
      }
      .pos-wrap .position-bar {
        flex: 1;
      }
      .test-row {
        display: flex;
        align-items: center;
        gap: 6px;
        flex-wrap: wrap;
      }
      .map-row {
        display: flex;
        gap: 8px;
        align-items: center;
        margin-bottom: 6px;
      }
      .map-row input,
      .map-row select {
        width: auto;
      }
      .caps-chips {
        margin: 6px 0 0;
      }
    `,
  ];

  private _areaName(areaId: string | null): string {
    if (!areaId) return "";
    return this.hass.areas?.[areaId]?.name ?? areaId;
  }

  /**
   * Group covers by area for display. Groups are sorted by area name; covers
   * without an area go into a trailing "no area" group. Returns a flat list
   * when no cover has an area assigned, so the plain list stays unchanged.
   */
  private _groupByArea(
    covers: CoverRuntime[]
  ): Array<{ areaId: string | null; label: string; covers: CoverRuntime[] }> {
    const groups = new Map<string | null, CoverRuntime[]>();
    for (const cover of covers) {
      const key = cover.area_id ?? null;
      const bucket = groups.get(key);
      if (bucket) bucket.push(cover);
      else groups.set(key, [cover]);
    }
    if (groups.size === 1 && groups.has(null)) {
      return [{ areaId: null, label: "", covers }];
    }
    const withArea = [...groups.entries()]
      .filter(([areaId]) => areaId !== null)
      .map(([areaId, items]) => ({
        areaId,
        label: this._areaName(areaId),
        covers: items,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
    const noArea = groups.get(null);
    if (noArea) {
      withArea.push({
        areaId: null,
        label: t(this.hass, "config_panel.covers_no_area"),
        covers: noArea,
      });
    }
    return withArea;
  }

  // ------------------------------------------------------------ dialog logic

  private _openAdd(): void {
    this._draft = emptyDraft();
    this._draftCaps = null;
    this._error = undefined;
    this.requestUpdate();
  }

  private _openEdit(cover: CoverRuntime): void {
    const { capabilities, current_position, contact_state, next_action, missing_entities, ...item } =
      cover;
    this._draft = JSON.parse(JSON.stringify(item)) as CoverItem;
    this._draftCaps = capabilities;
    this._error = undefined;
    this.requestUpdate();
  }

  private _patchDraft(patch: Partial<CoverItem>): void {
    if (!this._draft) return;
    this._draft = { ...this._draft, ...patch };
    this.requestUpdate();
  }

  private async _probe(): Promise<void> {
    if (!this._draft?.cover_entity_id) return;
    try {
      const res = await probeCover(
        this.hass,
        this._draft.cover_entity_id,
        this._draft.contact_entity_id ?? undefined
      );
      this._draftCaps = res.capabilities;
      const patch: Partial<CoverItem> = {};
      if (!this._draft.id) {
        patch.kind = res.suggested_kind;
      }
      if (
        res.suggested_contact_map &&
        Object.keys(this._draft.contact_state_map).length === 0
      ) {
        patch.contact_state_map = res.suggested_contact_map;
      }
      this._patchDraft(patch);
    } catch (e) {
      this._error = formatApiError(e, this.hass);
      this.requestUpdate();
    }
  }

  private async _save(): Promise<void> {
    if (!this._draft) return;
    if (!this._draft.name.trim() || !this._draft.cover_entity_id.trim()) {
      this._error = t(this.hass, "config_panel.covers_err_name_entity_required");
      this.requestUpdate();
      return;
    }
    this._busy = true;
    this.requestUpdate();
    try {
      await saveCover(this.hass, this.entryId, this._draft);
      this._draft = null;
      this._error = undefined;
    } catch (e) {
      this._error = formatApiError(e, this.hass);
    } finally {
      this._busy = false;
      this.requestUpdate();
    }
  }

  private async _delete(cover: CoverRuntime): Promise<void> {
    if (
      !window.confirm(
        t(this.hass, "config_panel.covers_delete_confirm", { name: cover.name })
      )
    ) {
      return;
    }
    try {
      await deleteCover(this.hass, this.entryId, cover.id);
    } catch (e) {
      this._error = formatApiError(e, this.hass);
      this.requestUpdate();
    }
  }

  private async _toggleEnabled(cover: CoverRuntime): Promise<void> {
    try {
      await saveCover(this.hass, this.entryId, { ...cover, enabled: !cover.enabled });
    } catch (e) {
      this._error = formatApiError(e, this.hass);
      this.requestUpdate();
    }
  }

  private async _test(
    cover: CoverRuntime,
    command: "open" | "close" | "stop" | "position"
  ): Promise<void> {
    try {
      await testCover(
        this.hass,
        this.entryId,
        cover.id,
        command,
        command === "position" ? (this._testPosition[cover.id] ?? 50) : undefined
      );
    } catch (e) {
      this._error = formatApiError(e, this.hass);
      this.requestUpdate();
    }
  }

  // -------------------------------------------------------------- rendering

  private _renderRow(cover: CoverRuntime) {
    const planRuns = this.snapshot.plan.flatMap((occ) =>
      occ.assignments
        .filter((r) => r.cover_item_id === cover.id)
        .map((r) => ({ occ, r }))
    );
    return html`
      <div class="list-row-wrap">
        <div class="list-row-accent ${cover.enabled ? "" : "inactive"}"></div>
        <div class="list-row">
          <div class="list-row-toggle" title=${t(this.hass, "config_panel.covers_toggle_automation")}>
            <ha-switch
              .checked=${cover.enabled}
              @click=${() => this._toggleEnabled(cover)}
            ></ha-switch>
          </div>
          <div class="list-main">
            <p class="list-name">
              <ha-icon .icon=${KIND_ICONS[cover.kind] ?? KIND_ICONS.other}></ha-icon>
              ${cover.name}
            </p>
            <div class="cover-badges">
              ${cover.area_id
                ? html`<span>📍 ${this._areaName(cover.area_id)}</span>`
                : nothing}
              ${cover.azimuth != null
                ? html`<span>🧭 ${formatAzimuth(cover.azimuth)}</span>`
                : nothing}
              ${cover.contact_state
                ? html`<span title=${t(this.hass, "config_panel.covers_contact_state")}>
                    <ha-icon
                      .icon=${CONTACT_ICONS[cover.contact_state] ?? CONTACT_ICONS.unknown}
                    ></ha-icon>
                    ${t(this.hass, `config_panel.contact_${cover.contact_state}`)}
                  </span>`
                : nothing}
              ${cover.next_action
                ? html`<span>
                    ${cover.next_action.armed ? "⏳" : "→"}
                    ${formatTime(cover.next_action.when)} ·
                    ${cover.next_action.position}% (${cover.next_action.scenario_name})
                  </span>`
                : nothing}
              ${cover.missing_entities.length
                ? html`<span class="badge badge-unavailable"
                    >${t(this.hass, "config_panel.covers_missing_entities", {
                      entities: cover.missing_entities.join(", "),
                    })}</span
                  >`
                : nothing}
            </div>
            ${cover.current_position != null
              ? html`
                  <div class="pos-wrap" style="margin-top:8px">
                    <div class="position-bar">
                      <div
                        class="position-bar-fill"
                        style="width:${cover.current_position}%"
                      ></div>
                    </div>
                    <span class="muted">${cover.current_position}%</span>
                  </div>
                `
              : nothing}
          </div>
          <div class="list-actions">
            <div class="test-row">
              <button class="btn-icon" title=${t(this.hass, "config_panel.covers_test_open")} @click=${() => this._test(cover, "open")}>▲</button>
              <button class="btn-icon" title=${t(this.hass, "config_panel.covers_test_stop")} @click=${() => this._test(cover, "stop")}>■</button>
              <button class="btn-icon" title=${t(this.hass, "config_panel.covers_test_close")} @click=${() => this._test(cover, "close")}>▼</button>
              ${cover.capabilities.supports_position
                ? html`
                    <input
                      type="number"
                      min="0"
                      max="100"
                      style="width:64px"
                      .value=${String(this._testPosition[cover.id] ?? 50)}
                      @input=${(e: Event) => {
                        this._testPosition = {
                          ...this._testPosition,
                          [cover.id]: Number((e.target as HTMLInputElement).value),
                        };
                      }}
                    />
                    <button class="btn-icon" @click=${() => this._test(cover, "position")}>
                      %
                    </button>
                  `
                : nothing}
            </div>
            <button class="btn-outline" @click=${() => this._openEdit(cover)}>
              ${t(this.hass, "config_panel.covers_edit")}
            </button>
            <button class="btn-danger" @click=${() => this._delete(cover)}>
              ${t(this.hass, "config_panel.covers_delete")}
            </button>
          </div>
          <details class="expand" style="flex-basis:100%">
            <summary>${t(this.hass, "config_panel.covers_today_summary")}</summary>
            ${planRuns.length
              ? html`
                  <table class="plain">
                    ${planRuns.map(
                      ({ occ, r }) => html`
                        <tr>
                          <td>${formatTime(occ.planned_at)}</td>
                          <td>${occ.scenario_name}</td>
                          <td>${r.target_position}%</td>
                          <td>
                            <span class="badge badge-${occ.fired ? (r.status === "done" ? (r.result ?? "skipped") : r.status) : "planned"}">
                              ${t(
                                this.hass,
                                `config_panel.status_${occ.fired ? (r.status === "done" ? (r.result ?? "skipped") : r.status) : "planned"}`
                              )}
                            </span>
                          </td>
                          <td class="muted">${r.reason ?? ""}</td>
                        </tr>
                      `
                    )}
                  </table>
                `
              : html`<p class="muted">
                  ${t(this.hass, "config_panel.covers_today_none")}
                </p>`}
          </details>
        </div>
      </div>
    `;
  }

  private _renderContactMapEditor(draft: CoverItem) {
    const entries = Object.entries(draft.contact_state_map);
    const meanings = ["closed", "tilted", "open"];
    return html`
      <div class="section-title">
        ${t(this.hass, "config_panel.covers_contact_map_title")}
      </div>
      <p class="section-desc">
        ${t(this.hass, "config_panel.covers_contact_map_desc")}
      </p>
      ${renderHelp(this.hass, "contact_map")}
      ${entries.map(
        ([raw, meaning]) => html`
          <div class="map-row">
            <input
              type="text"
              style="width:140px"
              .value=${raw}
              @change=${(e: Event) => {
                const newRaw = (e.target as HTMLInputElement).value.trim();
                const map = { ...draft.contact_state_map };
                delete map[raw];
                if (newRaw) map[newRaw] = meaning;
                this._patchDraft({ contact_state_map: map });
              }}
            />
            <span>→</span>
            <select
              .value=${meaning}
              @change=${(e: Event) =>
                this._patchDraft({
                  contact_state_map: {
                    ...draft.contact_state_map,
                    [raw]: (e.target as HTMLSelectElement).value,
                  },
                })}
            >
              ${meanings.map(
                (m) => html`<option value=${m} ?selected=${m === meaning}>
                  ${t(this.hass, `config_panel.contact_${m}`)}
                </option>`
              )}
            </select>
            <button
              class="cond-remove"
              @click=${() => {
                const map = { ...draft.contact_state_map };
                delete map[raw];
                this._patchDraft({ contact_state_map: map });
              }}
            >
              ✕
            </button>
          </div>
        `
      )}
      <button
        class="btn-icon"
        @click=${() =>
          this._patchDraft({
            contact_state_map: { ...draft.contact_state_map, "": "closed" },
          })}
      >
        ＋ ${t(this.hass, "config_panel.covers_contact_map_add")}
      </button>
    `;
  }

  private _renderDialog() {
    const draft = this._draft;
    if (!draft) return nothing;
    const areas = Object.values(this.hass.areas ?? {});
    const caps = this._draftCaps;
    const isAwning = draft.kind === "awning";
    return html`
      <div class="dialog-backdrop" @click=${(e: Event) => {
        if (e.target === e.currentTarget) {
          this._draft = null;
          this.requestUpdate();
        }
      }}>
        <div class="dialog">
          <h3>
            ${draft.id
              ? t(this.hass, "config_panel.covers_dialog_edit", { name: draft.name })
              : t(this.hass, "config_panel.covers_dialog_new")}
          </h3>
          ${this._error ? html`<p class="error">${this._error}</p>` : nothing}

          ${renderEntityDatalist(this.hass, "ac-covers-list", ["cover"])}
          ${renderEntityDatalist(this.hass, "ac-contacts-list", [
            "binary_sensor",
            "sensor",
          ])}
          ${renderEntityDatalist(this.hass, "ac-scripts-list", ["script"])}
          <datalist id="ac-areas-list">
            ${areas.map((a) => html`<option value=${a.area_id}>${a.name}</option>`)}
          </datalist>

          <div class="row">
            <div class="grow">
              <label class="field-label">${t(this.hass, "config_panel.covers_field_name")}</label>
              <input
                type="text"
                .value=${draft.name}
                @input=${(e: Event) =>
                  this._patchDraft({ name: (e.target as HTMLInputElement).value })}
              />
            </div>
            <div class="grow">
              <label class="field-label">${t(this.hass, "config_panel.covers_field_kind")}</label>
              <select
                .value=${draft.kind}
                @change=${(e: Event) =>
                  this._patchDraft({ kind: (e.target as HTMLSelectElement).value })}
              >
                ${KINDS.map(
                  (k) => html`<option value=${k} ?selected=${k === draft.kind}>
                    ${t(this.hass, `config_panel.kind_${k}`)}
                  </option>`
                )}
              </select>
            </div>
          </div>

          <div class="row">
            <div class="grow">
              <label class="field-label">${t(this.hass, "config_panel.covers_field_area")}</label>
              <input
                type="text"
                list="ac-areas-list"
                .value=${draft.area_id ?? ""}
                @input=${(e: Event) =>
                  this._patchDraft({
                    area_id: (e.target as HTMLInputElement).value || null,
                  })}
              />
            </div>
            <div class="grow">
              <label class="field-label">${t(this.hass, "config_panel.covers_field_azimuth")}</label>
              <input
                type="number"
                min="0"
                max="359"
                .value=${draft.azimuth == null ? "" : String(draft.azimuth)}
                @input=${(e: Event) => {
                  const raw = (e.target as HTMLInputElement).value;
                  this._patchDraft({ azimuth: raw === "" ? null : Number(raw) });
                }}
              />
            </div>
          </div>
          <div class="chips" style="margin-bottom:12px">
            ${COMPASS.map(
              ([label, deg]) => html`
                <button
                  type="button"
                  class="chip ${draft.azimuth === deg ? "selected" : ""}"
                  @click=${() => this._patchDraft({ azimuth: deg })}
                >
                  ${label}
                </button>
              `
            )}
          </div>

          <div class="row">
            <div class="grow">
              <label class="field-label">${t(this.hass, "config_panel.covers_field_entity")}</label>
              <input
                type="text"
                list="ac-covers-list"
                .value=${draft.cover_entity_id}
                spellcheck="false"
                autocomplete="off"
                @input=${(e: Event) =>
                  this._patchDraft({
                    cover_entity_id: (e.target as HTMLInputElement).value,
                  })}
                @change=${() => this._probe()}
              />
            </div>
          </div>
          ${caps
            ? html`
                <div class="chips caps-chips">
                  <span class="chip readonly">
                    ${caps.supports_position ? "✓" : "✕"}
                    ${t(this.hass, "config_panel.covers_cap_position")}
                  </span>
                  <span class="chip readonly">
                    ${caps.supports_tilt ? "✓" : "✕"}
                    ${t(this.hass, "config_panel.covers_cap_tilt")}
                  </span>
                  ${!caps.available
                    ? html`<span class="chip readonly">
                        ⚠ ${t(this.hass, "config_panel.covers_cap_unavailable")}
                      </span>`
                    : nothing}
                </div>
              `
            : nothing}

          <div class="section-title">
            ${t(this.hass, "config_panel.covers_low_mode_title")}
          </div>
          <p class="section-desc">
            ${t(this.hass, "config_panel.covers_low_mode_desc")}
          </p>
          ${renderHelp(this.hass, "low_mode")}
          <div class="row">
            <div class="grow">
              <label class="field-label">${t(this.hass, "config_panel.covers_field_low_entity")}</label>
              <input
                type="text"
                list="ac-covers-list"
                .value=${draft.low_mode_entity_id ?? ""}
                spellcheck="false"
                autocomplete="off"
                @input=${(e: Event) =>
                  this._patchDraft({
                    low_mode_entity_id:
                      (e.target as HTMLInputElement).value || null,
                  })}
              />
            </div>
            <div class="grow">
              <label class="field-label">${t(this.hass, "config_panel.covers_field_low_script")}</label>
              <input
                type="text"
                list="ac-scripts-list"
                .value=${draft.low_mode_script_id ?? ""}
                spellcheck="false"
                autocomplete="off"
                @input=${(e: Event) =>
                  this._patchDraft({
                    low_mode_script_id:
                      (e.target as HTMLInputElement).value || null,
                  })}
              />
            </div>
          </div>

          ${!isAwning
            ? html`
                <div class="section-title">
                  ${t(this.hass, "config_panel.covers_contact_title")}
                </div>
                <p class="section-desc">
                  ${t(this.hass, "config_panel.covers_contact_desc")}
                </p>
                <div class="row">
                  <div class="grow">
                    <label class="field-label">${t(this.hass, "config_panel.covers_field_contact")}</label>
                    <input
                      type="text"
                      list="ac-contacts-list"
                      .value=${draft.contact_entity_id ?? ""}
                      spellcheck="false"
                      autocomplete="off"
                      @input=${(e: Event) =>
                        this._patchDraft({
                          contact_entity_id:
                            (e.target as HTMLInputElement).value || null,
                        })}
                      @change=${() => this._probe()}
                    />
                  </div>
                </div>
                ${draft.contact_entity_id
                  ? html`
                      ${this._renderContactMapEditor(draft)}
                      <div class="section-title">
                        ${t(this.hass, "config_panel.covers_safety_title")}
                      </div>
                      <p class="section-desc">
                        ${t(this.hass, "config_panel.covers_safety_desc")}
                      </p>
                      ${renderHelp(this.hass, "safety")}
                      <div class="row">
                        <div class="grow">
                          <label class="field-label">${t(this.hass, "config_panel.covers_field_ventilation")}</label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            .value=${String(draft.safety.ventilation_position)}
                            @input=${(e: Event) =>
                              this._patchDraft({
                                safety: {
                                  ...draft.safety,
                                  ventilation_position: Number(
                                    (e.target as HTMLInputElement).value
                                  ),
                                },
                              })}
                          />
                        </div>
                        <div class="grow">
                          <label class="field-label">${t(this.hass, "config_panel.covers_field_safety_mode")}</label>
                          <select
                            .value=${draft.safety.mode}
                            @change=${(e: Event) =>
                              this._patchDraft({
                                safety: {
                                  ...draft.safety,
                                  mode: (e.target as HTMLSelectElement).value as
                                    | "block"
                                    | "clamp",
                                },
                              })}
                          >
                            <option value="block" ?selected=${draft.safety.mode === "block"}>
                              ${t(this.hass, "config_panel.covers_safety_block")}
                            </option>
                            <option value="clamp" ?selected=${draft.safety.mode === "clamp"}>
                              ${t(this.hass, "config_panel.covers_safety_clamp")}
                            </option>
                          </select>
                        </div>
                      </div>
                      <label class="checkbox-row">
                        <input
                          type="checkbox"
                          .checked=${draft.safety.block_when_tilted}
                          @change=${(e: Event) =>
                            this._patchDraft({
                              safety: {
                                ...draft.safety,
                                block_when_tilted: (e.target as HTMLInputElement)
                                  .checked,
                              },
                            })}
                        />
                        ${t(this.hass, "config_panel.covers_safety_tilted")}
                      </label>
                    `
                  : nothing}
              `
            : nothing}

          <div class="dialog-actions">
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
          <ha-icon icon="mdi:window-shutter-cog"></ha-icon>
          ${t(this.hass, "config_panel.covers_title")}
          <span class="header-actions">
            <button class="btn" @click=${this._openAdd}>
              ＋ ${t(this.hass, "config_panel.covers_add")}
            </button>
          </span>
        </div>
        <div class="card-content">
          <p class="intro">${t(this.hass, "config_panel.covers_intro")}</p>
          ${this._error && !this._draft
            ? html`<p class="error">${this._error}</p>`
            : nothing}
          ${snap.covers.length
            ? this._groupByArea(snap.covers).map((group) =>
                group.label
                  ? html`
                      <div class="section-title">
                        <ha-icon icon="mdi:floor-plan"></ha-icon>
                        ${group.label}
                        <span class="muted">${group.covers.length}</span>
                      </div>
                      ${group.covers.map((c) => this._renderRow(c))}
                    `
                  : group.covers.map((c) => this._renderRow(c))
              )
            : html`<div class="empty-state">
                <ha-icon icon="mdi:window-shutter-alert"></ha-icon>
                <p>${t(this.hass, "config_panel.covers_empty")}</p>
              </div>`}
        </div>
      </ha-card>
      ${this._renderDialog()}
    `;
  }
}

defineCustomElementOnce("ac-view-covers", ViewCovers);
