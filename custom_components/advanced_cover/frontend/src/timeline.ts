import { css, html, nothing, type TemplateResult } from "lit";

export interface TimelineEvent {
  id: string;
  minute: number; // minutes since local midnight
  colorClass: string; // executed | will_run | would_skip | skipped | armed | ...
  label: string; // "08:24 · Morgens alles auf"
  timeLabel: string; // "08:24"
  onClick: () => void;
}

export interface TimelineOptions {
  events: TimelineEvent[];
  sunriseMin: number | null;
  sunsetMin: number | null;
  nowMin: number;
  showTimeLabels: boolean; // marker time labels (desktop/tablet)
  axisEveryH: number; // hour-axis tick spacing
}

/** Night → day → night gradient derived from the real sun times. */
function dayGradient(sunriseMin: number | null, sunsetMin: number | null): string {
  const night = "var(--ac-timeline-night)";
  const day = "var(--ac-timeline-day)";
  if (sunriseMin == null || sunsetMin == null || sunriseMin >= sunsetMin) {
    return night;
  }
  const p = (m: number): number => Math.max(0, Math.min(100, (m / 1440) * 100));
  const sr = p(sunriseMin);
  const ss = p(sunsetMin);
  const f = 2.5; // fade width in %
  return (
    `linear-gradient(90deg, ${night} 0%, ${night} ${Math.max(0, sr - f)}%, ` +
    `${day} ${sr + f}%, ${day} ${Math.max(sr + f, ss - f)}%, ` +
    `${night} ${ss + f}%, ${night} 100%)`
  );
}

/**
 * Assign a stacking row (0 or 1) to each event so two markers closer than
 * 40 min never visually overlap (plan §4 timeline).
 */
function assignRows(events: TimelineEvent[]): Map<string, number> {
  const rows = new Map<string, number>();
  const sorted = [...events].sort((a, b) => a.minute - b.minute);
  let prevMin = -1000;
  let prevRow = 1;
  for (const ev of sorted) {
    const row = ev.minute - prevMin < 40 ? (prevRow === 0 ? 1 : 0) : 0;
    rows.set(ev.id, row);
    prevMin = ev.minute;
    prevRow = row;
  }
  return rows;
}

export function renderTimeline(opts: TimelineOptions): TemplateResult {
  const rows = assignRows(opts.events);
  const ticks: number[] = [];
  for (let h = 0; h <= 24; h += opts.axisEveryH) ticks.push(h);
  const gradient = dayGradient(opts.sunriseMin, opts.sunsetMin);
  return html`
    <div class="tl-scroll">
      <div class="tl" style="background:${gradient}">
        ${ticks.map(
          (h) => html`<span
            class="tl-tick"
            style="left:${(h / 24) * 100}%"
          ></span>`
        )}
        <div class="tl-now" style="left:${(opts.nowMin / 1440) * 100}%">
          <span class="tl-now-dot"></span>
        </div>
        ${opts.events.map((ev) => {
          const left = (ev.minute / 1440) * 100;
          const row = rows.get(ev.id) ?? 0;
          return html`
            <button
              type="button"
              class="tl-marker ${ev.colorClass} row-${row}"
              style="left:${left}%"
              title=${ev.label}
              aria-label=${ev.label}
              @click=${ev.onClick}
            >
              ${opts.showTimeLabels
                ? html`<span class="tl-time">${ev.timeLabel}</span>`
                : nothing}
              <span class="tl-dot"></span>
            </button>
          `;
        })}
      </div>
      <div class="tl-axis">
        ${ticks.map(
          (h) =>
            html`<span class="tl-axis-label" style="left:${(h / 24) * 100}%"
              >${h}</span
            >`
        )}
      </div>
    </div>
  `;
}

export const timelineStyles = css`
  :host {
    --ac-timeline-night: color-mix(
      in srgb,
      var(--primary-text-color) 10%,
      var(--card-background-color)
    );
    --ac-timeline-day: color-mix(
      in srgb,
      var(--warning-color, #f0b23a) 20%,
      var(--card-background-color)
    );
  }
  .tl-scroll {
    overflow-x: auto;
    overflow-y: hidden;
    -webkit-overflow-scrolling: touch;
    padding-bottom: 2px;
  }
  .tl {
    position: relative;
    height: 96px;
    min-width: 100%;
    border-radius: 10px;
    border: 1px solid var(--divider-color);
    box-sizing: border-box;
  }
  .tl-tick {
    position: absolute;
    top: 0;
    bottom: 18px;
    width: 1px;
    background: color-mix(in srgb, var(--divider-color) 70%, transparent);
  }
  .tl-now {
    position: absolute;
    top: 4px;
    bottom: 4px;
    width: 2px;
    background: var(--primary-color);
    transform: translateX(-1px);
    z-index: 3;
  }
  .tl-now-dot {
    position: absolute;
    top: -3px;
    left: 50%;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--primary-color);
    transform: translateX(-50%);
    animation: tl-pulse 2s ease-in-out infinite;
  }
  @keyframes tl-pulse {
    0%,
    100% {
      box-shadow: 0 0 0 0 color-mix(in srgb, var(--primary-color) 55%, transparent);
    }
    50% {
      box-shadow: 0 0 0 5px transparent;
    }
  }
  .tl-marker {
    position: absolute;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    border: none;
    background: none;
    padding: 0;
    cursor: pointer;
    transform: translateX(-50%);
    color: var(--secondary-text-color);
    z-index: 2;
  }
  .tl-marker.row-0 {
    top: 10px;
  }
  .tl-marker.row-1 {
    top: 42px;
  }
  .tl-time {
    font-size: 0.66rem;
    font-variant-numeric: tabular-nums;
    background: var(--card-background-color);
    padding: 0 3px;
    border-radius: 4px;
    white-space: nowrap;
  }
  .tl-dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: var(--primary-color);
    border: 2px solid var(--card-background-color);
    box-sizing: border-box;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
    transition: transform 0.12s ease;
  }
  .tl-marker:hover .tl-dot {
    transform: scale(1.3);
  }
  .tl-marker.executed .tl-dot {
    background: var(--success-color, #43a047);
  }
  .tl-marker.will_run .tl-dot,
  .tl-marker.planned .tl-dot {
    background: var(--primary-color);
  }
  .tl-marker.would_skip .tl-dot,
  .tl-marker.armed .tl-dot {
    background: var(--warning-color, #f0b23a);
  }
  .tl-marker.skipped .tl-dot,
  .tl-marker.expired .tl-dot,
  .tl-marker.unknown .tl-dot {
    background: var(--disabled-text-color, #6d7476);
  }
  .tl-marker.blocked_safety .tl-dot,
  .tl-marker.unavailable .tl-dot {
    background: var(--error-color, #d93025);
  }
  .tl-axis {
    position: relative;
    height: 14px;
    margin-top: 3px;
  }
  .tl-axis-label {
    position: absolute;
    transform: translateX(-50%);
    font-size: 0.68rem;
    color: var(--secondary-text-color);
    font-variant-numeric: tabular-nums;
  }

  @container acview (max-width: 900px) {
    .tl {
      height: 84px;
    }
  }
  @container acview (max-width: 620px) {
    .tl {
      height: 72px;
    }
    .tl-marker.row-1 {
      top: 34px;
    }
  }
`;
