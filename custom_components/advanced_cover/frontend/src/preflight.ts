import { html, nothing, type TemplateResult } from "lit";
import { formatTime } from "./helpers";
import { t } from "./i18n";
import type { ConditionEval, HomeAssistant, Preflight } from "./types";

const VERDICT_META: Record<
  Preflight["verdict"],
  { icon: string; key: string }
> = {
  would_run: { icon: "mdi:play-circle-outline", key: "preflight_would_run" },
  would_skip: { icon: "mdi:debug-step-over", key: "preflight_would_skip" },
  unknown: { icon: "mdi:help-circle-outline", key: "preflight_unknown" },
};

/** Localized one-line summary of one evaluated condition. */
export function condSummary(hass: HomeAssistant, cond: ConditionEval): string {
  const values: Record<string, string | number> = { ...cond.summary_values };
  // The backend sends the raw operator ("above"/"below"/"between"); localize it.
  if (typeof values.op === "string") {
    values.op = t(hass, `config_panel.cond_op_${values.op}`);
  }
  // Translate the abstract contact states used in expected/actual.
  for (const field of ["actual", "expected"] as const) {
    if (
      cond.type === "contact" &&
      typeof values[field] === "string" &&
      values[field]
    ) {
      values[field] = String(values[field])
        .split(", ")
        .map((s) => t(hass, `config_panel.contact_${s}`))
        .join(", ");
    }
  }
  return t(hass, cond.summary_key, values);
}

/**
 * The preflight badge ("Would run now" / "Would be skipped now" / "Cannot be
 * evaluated"). Renders nothing for a scenario without conditions (no noise).
 */
export function preflightBadge(
  hass: HomeAssistant,
  pf: Preflight | null | undefined
): TemplateResult | typeof nothing {
  if (!pf) return nothing;
  if (pf.verdict === "would_run" && pf.conditions.length === 0) return nothing;
  const meta = VERDICT_META[pf.verdict];
  return html`
    <span
      class="preflight-badge ${pf.verdict}"
      title=${t(hass, "config_panel.preflight_evaluated_at", {
        time: formatTime(pf.evaluated_at),
      })}
    >
      <ha-icon icon=${meta.icon}></ha-icon>
      ${t(hass, `config_panel.${meta.key}`)}
    </span>
  `;
}

/** Plain-text reason for a would_skip/unknown verdict ("… and N more"). */
export function preflightReason(
  hass: HomeAssistant,
  pf: Preflight | null | undefined
): string | null {
  if (!pf) return null;
  const fails = pf.conditions.filter((c) => c.ok === false);
  const source = fails.length
    ? fails
    : pf.conditions.filter((c) => c.ok === null);
  if (!source.length) return null;
  const first = condSummary(hass, source[0]);
  if (source.length === 1) return first;
  return `${first} · ${t(hass, "config_panel.preflight_and_more", {
    n: source.length - 1,
  })}`;
}

const CHECK_META: Record<string, { icon: string; cls: string }> = {
  ok: { icon: "mdi:check-circle", cls: "ok" },
  fail: { icon: "mdi:alert-circle-outline", cls: "fail" },
  na: { icon: "mdi:help-circle-outline", cls: "na" },
};

/** Full checklist of a preflight's conditions (shown on expand). */
export function renderCondChecklist(
  hass: HomeAssistant,
  conditions: ConditionEval[]
): TemplateResult[] {
  return conditions.map((c) => {
    const meta =
      c.ok === true ? CHECK_META.ok : c.ok === false ? CHECK_META.fail : CHECK_META.na;
    return html`
      <div class="cond-check ${meta.cls}">
        <ha-icon icon=${meta.icon}></ha-icon>
        <span>${condSummary(hass, c)}</span>
      </div>
    `;
  });
}
