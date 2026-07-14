import { html, nothing, type TemplateResult } from "lit";
import { t } from "./i18n";
import type { Condition, ConditionType, HomeAssistant } from "./types";

const CONTACT_STATES = ["closed", "tilted", "open"] as const;

export interface ConditionEditorOptions {
  hass: HomeAssistant;
  conditions: Condition[];
  onChange: (conditions: Condition[]) => void;
  /** Datalist id (rendered by the host once) with all entity ids. */
  entityListId: string;
  /** Whether the contact condition type is offered (cover has a contact). */
  contactAvailable: boolean;
}

function emptyCondition(type: ConditionType): Condition {
  switch (type) {
    case "cover_position":
      return { type, op: "above", value: 5, value2: null };
    case "contact":
      return { type, accepted: ["closed"] };
    case "numeric_state":
      return { type, entity_id: "", above: null, below: null };
    default:
      return { type, entity_id: "", states: [] };
  }
}

/** Known states of an entity for the state suggestion list. */
function knownStates(hass: HomeAssistant, entityId?: string | null): string[] {
  if (!entityId) return [];
  const st = hass.states[entityId];
  if (!st) return [];
  const states = new Set<string>([st.state]);
  const domain = entityId.split(".", 1)[0];
  if (domain === "input_select" || domain === "select") {
    for (const opt of (st.attributes?.options as string[] | undefined) ?? []) {
      states.add(opt);
    }
  }
  if (domain === "binary_sensor" || domain === "input_boolean" || domain === "switch") {
    states.add("on");
    states.add("off");
  }
  return [...states];
}

function update(
  opts: ConditionEditorOptions,
  index: number,
  patch: Partial<Condition>
): void {
  const next = opts.conditions.map((c, i) => (i === index ? { ...c, ...patch } : c));
  opts.onChange(next);
}

function remove(opts: ConditionEditorOptions, index: number): void {
  opts.onChange(opts.conditions.filter((_, i) => i !== index));
}

function renderStateChips(
  opts: ConditionEditorOptions,
  index: number,
  cond: Condition
): TemplateResult {
  const states = cond.states ?? [];
  const listId = `${opts.entityListId}-states-${index}`;
  const suggestions = knownStates(opts.hass, cond.entity_id);
  const addState = (input: HTMLInputElement): void => {
    const value = input.value.trim();
    if (!value || states.includes(value)) return;
    update(opts, index, { states: [...states, value] });
    input.value = "";
  };
  return html`
    <span class="chips">
      ${states.map(
        (s) => html`
          <button
            type="button"
            class="chip selected"
            title=${t(opts.hass, "config_panel.cond_remove_state")}
            @click=${() =>
              update(opts, index, { states: states.filter((x) => x !== s) })}
          >
            ${s} ✕
          </button>
        `
      )}
    </span>
    <input
      type="text"
      style="min-width:110px"
      list=${listId}
      placeholder=${t(opts.hass, "config_panel.cond_state_placeholder")}
      @keydown=${(e: KeyboardEvent) => {
        if (e.key === "Enter") {
          e.preventDefault();
          addState(e.target as HTMLInputElement);
        }
      }}
      @change=${(e: Event) => addState(e.target as HTMLInputElement)}
    />
    <datalist id=${listId}>
      ${suggestions.map((s) => html`<option value=${s}></option>`)}
    </datalist>
  `;
}

function renderCondition(
  opts: ConditionEditorOptions,
  cond: Condition,
  index: number
): TemplateResult {
  const { hass } = opts;
  let body: TemplateResult;
  switch (cond.type) {
    case "entity_state":
    case "entity_state_not":
      body = html`
        <span>${t(hass, "config_panel.cond_only_if")}</span>
        <input
          type="text"
          class="cond-entity"
          list=${opts.entityListId}
          .value=${cond.entity_id ?? ""}
          spellcheck="false"
          autocomplete="off"
          @input=${(e: Event) =>
            update(opts, index, {
              entity_id: (e.target as HTMLInputElement).value,
            })}
        />
        <span>
          ${cond.type === "entity_state"
            ? t(hass, "config_panel.cond_is_one_of")
            : t(hass, "config_panel.cond_is_none_of")}
        </span>
        ${renderStateChips(opts, index, cond)}
      `;
      break;
    case "cover_position":
      body = html`
        <span>${t(hass, "config_panel.cond_position_prefix")}</span>
        <select
          .value=${cond.op ?? "above"}
          @change=${(e: Event) =>
            update(opts, index, {
              op: (e.target as HTMLSelectElement).value as Condition["op"],
            })}
        >
          <option value="above">${t(hass, "config_panel.cond_op_above")}</option>
          <option value="below">${t(hass, "config_panel.cond_op_below")}</option>
          <option value="between">${t(hass, "config_panel.cond_op_between")}</option>
        </select>
        <input
          type="number"
          min="0"
          max="100"
          style="width:80px"
          .value=${String(cond.value ?? 0)}
          @input=${(e: Event) =>
            update(opts, index, {
              value: Number((e.target as HTMLInputElement).value),
            })}
        />
        ${cond.op === "between"
          ? html`
              <span>${t(hass, "config_panel.cond_and")}</span>
              <input
                type="number"
                min="0"
                max="100"
                style="width:80px"
                .value=${String(cond.value2 ?? 100)}
                @input=${(e: Event) =>
                  update(opts, index, {
                    value2: Number((e.target as HTMLInputElement).value),
                  })}
              />
            `
          : nothing}
        <span>${t(hass, "config_panel.cond_position_suffix")}</span>
      `;
      break;
    case "contact":
      body = html`
        <span>${t(hass, "config_panel.cond_contact_prefix")}</span>
        <span class="chips">
          ${CONTACT_STATES.map((s) => {
            const accepted = cond.accepted ?? [];
            const selected = accepted.includes(s);
            return html`
              <button
                type="button"
                class="chip ${selected ? "selected" : ""}"
                @click=${() =>
                  update(opts, index, {
                    accepted: selected
                      ? accepted.filter((x) => x !== s)
                      : [...accepted, s],
                  })}
              >
                ${t(hass, `config_panel.contact_${s}`)}
              </button>
            `;
          })}
        </span>
      `;
      break;
    case "numeric_state":
      body = html`
        <span>${t(hass, "config_panel.cond_only_if")}</span>
        <input
          type="text"
          class="cond-entity"
          list=${opts.entityListId}
          .value=${cond.entity_id ?? ""}
          spellcheck="false"
          autocomplete="off"
          @input=${(e: Event) =>
            update(opts, index, {
              entity_id: (e.target as HTMLInputElement).value,
            })}
        />
        <span>${t(hass, "config_panel.cond_numeric_above")}</span>
        <input
          type="number"
          style="width:90px"
          .value=${cond.above == null ? "" : String(cond.above)}
          @input=${(e: Event) => {
            const raw = (e.target as HTMLInputElement).value;
            update(opts, index, { above: raw === "" ? null : Number(raw) });
          }}
        />
        <span>${t(hass, "config_panel.cond_numeric_below")}</span>
        <input
          type="number"
          style="width:90px"
          .value=${cond.below == null ? "" : String(cond.below)}
          @input=${(e: Event) => {
            const raw = (e.target as HTMLInputElement).value;
            update(opts, index, { below: raw === "" ? null : Number(raw) });
          }}
        />
      `;
      break;
    default:
      body = html`<span class="muted">?</span>`;
  }
  return html`
    <div class="cond-row">
      ${body}
      <button
        type="button"
        class="cond-remove"
        title=${t(hass, "config_panel.cond_remove")}
        @click=${() => remove(opts, index)}
      >
        ✕
      </button>
    </div>
  `;
}

/** Sentence-builder condition list (AND semantics, no operators). */
export function renderConditionEditor(
  opts: ConditionEditorOptions
): TemplateResult {
  const { hass } = opts;
  const types: ConditionType[] = [
    "entity_state",
    "entity_state_not",
    "cover_position",
    "numeric_state",
    ...(opts.contactAvailable ? (["contact"] as ConditionType[]) : []),
  ];
  return html`
    <div>
      ${opts.conditions.length
        ? html`<p class="muted">${t(hass, "config_panel.cond_all_must_match")}</p>`
        : nothing}
      ${opts.conditions.map((c, i) => renderCondition(opts, c, i))}
      <div class="row">
        <select
          @change=${(e: Event) => {
            const sel = e.target as HTMLSelectElement;
            if (!sel.value) return;
            opts.onChange([
              ...opts.conditions,
              emptyCondition(sel.value as ConditionType),
            ]);
            sel.value = "";
          }}
        >
          <option value="">
            ＋ ${t(hass, "config_panel.cond_add")}
          </option>
          ${types.map(
            (ct) => html`
              <option value=${ct}>${t(hass, `config_panel.cond_type_${ct}`)}</option>
            `
          )}
        </select>
      </div>
    </div>
  `;
}
