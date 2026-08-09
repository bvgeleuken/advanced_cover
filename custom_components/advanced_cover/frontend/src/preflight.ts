import { html, nothing, type TemplateResult } from "lit";
import { formatTime } from "./helpers";
import { t } from "./i18n";
import type {
  ConditionEval,
  HomeAssistant,
  Occurrence,
  Preflight,
} from "./types";

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

/** Verdict of one occurrence: the block's own conditions plus every cover's.

    Cover-scoped conditions (position, contact, relative sun) live in the
    per-cover preflights, so a block whose own conditions all pass can still
    end up with no cover running — the badge has to say so. */
export function occVerdict(occ: Occurrence): Preflight["verdict"] {
  const block = occ.preflight?.verdict ?? "would_run";
  if (block !== "would_run" || !occ.assignments.length) return block;
  if (occ.covers_would_run > 0) return "would_run";
  const kinds = occ.assignments.map((r) => r.preflight?.verdict ?? "would_run");
  if (kinds.includes("would_skip")) return "would_skip";
  return kinds.includes("unknown") ? "unknown" : "would_run";
}

/** The occurrence's blocking reason: from the block, else from its covers. */
export function occPreflightReason(
  hass: HomeAssistant,
  occ: Occurrence
): string | null {
  const fromBlock = preflightReason(hass, occ.preflight);
  if (fromBlock) return fromBlock;
  for (const run of occ.assignments) {
    const reason = preflightReason(hass, run.preflight);
    if (reason) return reason;
  }
  return null;
}

/** Preflight badge for a whole occurrence (block + per-cover conditions). */
export function occPreflightBadge(
  hass: HomeAssistant,
  occ: Occurrence
): TemplateResult | typeof nothing {
  const pf = occ.preflight;
  if (!pf) return nothing;
  const verdict = occVerdict(occ);
  // The scenario's cover-scoped conditions live in the per-cover preflights;
  // they count as "this scenario has conditions" just like the block's own.
  const hasConditions =
    pf.conditions.length > 0 ||
    occ.assignments.some((r) =>
      (r.preflight?.conditions ?? []).some((c) => c.scope === "scenario")
    );
  if (verdict === "would_run" && !hasConditions) return nothing;
  return preflightBadge(hass, pf, {
    verdict,
    reason: occPreflightReason(hass, occ),
    force: true,
  });
}

/**
 * The preflight badge ("Would run now" / "Would be skipped now" / "Cannot be
 * evaluated"). Renders nothing for a scenario without conditions (no noise).
 * ``reason`` is appended to the tooltip so hovering explains the verdict.
 */
export function preflightBadge(
  hass: HomeAssistant,
  pf: Preflight | null | undefined,
  options: {
    verdict?: Preflight["verdict"];
    reason?: string | null;
    force?: boolean;
  } = {}
): TemplateResult | typeof nothing {
  if (!pf) return nothing;
  const verdict = options.verdict ?? pf.verdict;
  if (!options.force && verdict === "would_run" && pf.conditions.length === 0)
    return nothing;
  const meta = VERDICT_META[verdict];
  const checked = t(hass, "config_panel.preflight_evaluated_at", {
    time: formatTime(pf.evaluated_at),
  });
  const reason = options.reason ?? preflightReason(hass, pf);
  return html`
    <span
      class="preflight-badge ${verdict}"
      title=${reason ? `${reason} · ${checked}` : checked}
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
