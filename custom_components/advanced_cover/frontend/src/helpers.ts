import { fireEvent } from "./fire-event";
import { t } from "./i18n";
import type { HomeAssistant } from "./types";

/** Home Assistant may put a string or structured object in `error`. */
export function formatApiError(value: unknown, hass?: HomeAssistant): string {
  const fallback =
    hass?.localize != null
      ? t(hass, "config_panel.errors_request_failed")
      : "Request failed";
  if (value == null || value === "") {
    return fallback;
  }
  if (typeof value === "string") {
    return value;
  }
  if (value instanceof Error) {
    return value.message;
  }
  if (typeof value === "object") {
    const o = value as Record<string, unknown>;
    if (typeof o.message === "string") {
      return o.message;
    }
    if (typeof o.error === "string") {
      return o.error;
    }
    try {
      return JSON.stringify(value);
    } catch {
      return fallback;
    }
  }
  return String(value);
}

/** Safe when the panel bundle runs twice (navigation, scoped custom element registry). */
export function defineCustomElementOnce(
  name: string,
  constructor: CustomElementConstructor,
  options?: ElementDefinitionOptions
): void {
  if (customElements.get(name) !== undefined) {
    return;
  }
  customElements.define(name, constructor, options);
}

export const navigate = (_node: unknown, path: string, replace = false): void => {
  if (replace) {
    history.replaceState(null, "", path);
  } else {
    history.pushState(null, "", path);
  }
  fireEvent(window, "location-changed", { replace });
};

/** "HH:MM" for an ISO timestamp in the user's locale. */
export function formatTime(iso: string | null | undefined): string {
  if (!iso) return "–";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "–";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/** Minutes since local midnight for an ISO timestamp (for timeline placement). */
export function minutesOfDay(iso: string): number | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.getHours() * 60 + d.getMinutes();
}
