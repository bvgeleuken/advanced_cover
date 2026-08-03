import { t } from "./i18n";
import type { HomeAssistant } from "./types";

/** Localize a backend run/log reason into a human-readable explanation.

    The backend stores technical English strings (entity ids, service
    errors). Recognized patterns are mapped to translated texts; anything
    unknown is shown verbatim so no reason is ever lost. */
export function formatReason(
  hass: HomeAssistant,
  reason: string | null | undefined
): string | null {
  if (!reason) return null;
  let m = reason.match(/^(\S+) is unavailable$/);
  if (m)
    return t(hass, "config_panel.reason_entity_unavailable", { entity: m[1] });
  if (reason === "trigger time already passed")
    return t(hass, "config_panel.reason_trigger_passed");
  m = reason.match(/^already at (\d+)% \(min delta (\d+)%\)$/);
  if (m)
    return t(hass, "config_panel.reason_already_at", {
      pos: m[1],
      delta: m[2],
    });
  m = reason.match(/^contact is (\w+); closing below (\d+)% is blocked$/);
  if (m)
    return t(hass, "config_panel.cond_sum_safety", { ventilation: m[2] });
  m = reason.match(/^(?:service|script) call failed: ([\s\S]*)$/);
  if (m) return t(hass, "config_panel.reason_service_failed", { error: m[1] });
  if (reason === "master switch is off")
    return t(hass, "config_panel.reason_master_off");
  if (reason === "cover automation is off")
    return t(hass, "config_panel.reason_cover_off");
  if (reason === "scenario or assignment removed" || reason === "cover removed")
    return t(hass, "config_panel.reason_removed");
  // Condition reasons from the engine ("sensor.x is 'on', expected …") are
  // already descriptive; possibly a "; "-joined list.
  return reason;
}
