const BASE = "advanced-cover";

export interface PanelPath {
  entryId: string | null;
  page: string;
}

export const getPath = (): PanelPath => {
  const parts = window.location.pathname.split("/").filter(Boolean);
  if (parts[0] !== BASE || parts.length < 2) {
    return { entryId: null, page: "today" };
  }
  return { entryId: parts[1], page: parts[2] || "today" };
};

export const exportPath = (entryId: string, page: string): string =>
  `/${BASE}/${entryId}/${page}`;

/** Deep-link support: `?editScenario=<id>` opens the scenario editor. */
export function getEditScenarioQuery(): string | null {
  try {
    return new URL(window.location.href).searchParams.get("editScenario");
  } catch {
    return null;
  }
}

/**
 * Remove `editScenario` from the URL without dispatching `location-changed`
 * (a navigate() would reload the panel and close the dialog again).
 */
export function stripEditScenarioQueryFromUrl(): void {
  try {
    const url = new URL(window.location.href);
    if (!url.searchParams.has("editScenario")) return;
    url.searchParams.delete("editScenario");
    const qs = url.searchParams.toString();
    history.replaceState(null, "", url.pathname + (qs ? `?${qs}` : "") + url.hash);
  } catch {
    /* ignore */
  }
}
