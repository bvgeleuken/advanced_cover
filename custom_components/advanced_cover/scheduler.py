"""Day plan computation, trigger timers and the re-arm state machine.

Design (plan §3/§4):
- The full day plan (including random offsets) is computed at midnight,
  on startup and after configuration changes. Random offsets are seeded
  with ``date + scenario id`` so the plan is stable across restarts.
- Conditions are checked at fire time only. If they fail and the scenario
  has a retry window, the assignment goes to *armed*: the scheduler
  subscribes to exactly the external entities of the failed conditions and
  re-evaluates the complete condition list on every change until the
  window expires. Each assignment executes at most once per day.
- Cover-position conditions never re-arm (no listener on the own cover).
"""

from __future__ import annotations

import asyncio
import logging
import random
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta
from typing import TYPE_CHECKING, Any

from homeassistant.const import EVENT_HOMEASSISTANT_STARTED
from homeassistant.core import (
    CALLBACK_TYPE,
    CoreState,
    Event,
    HomeAssistant,
    callback,
)
from homeassistant.helpers.event import (
    EventStateChangedData,
    async_track_point_in_time,
    async_track_state_change_event,
)
from homeassistant.helpers.sun import get_astral_event_date
from homeassistant.util import dt as dt_util

from .capabilities import resolve_contact_state
from .const import (
    RANDOM_DIRECTION_AFTER,
    RANDOM_DIRECTION_BEFORE,
    RESULT_ARMED,
    RESULT_EXPIRED,
    RESULT_SKIPPED,
    RESULT_UNAVAILABLE,
    RUN_STATE_ARMED,
    RUN_STATE_DONE,
    RUN_STATE_EXPIRED,
    RUN_STATE_IDLE,
    SUN_EVENT_SOLAR_NOON,
    TRIGGER_FIXED_TIME,
    WEEKDAYS,
)
from .engine import CoverContext, evaluate_conditions
from .executor import CoverExecutor, current_cover_position
from .models import Assignment, CoverItem, Scenario

if TYPE_CHECKING:
    from collections.abc import Callable

    from .coordinator import AdvancedCoverCoordinator

_LOGGER = logging.getLogger(__name__)

# Astral event name used by homeassistant.helpers.sun for solar noon.
_ASTRAL_EVENTS = {SUN_EVENT_SOLAR_NOON: "noon"}


def deterministic_random_offset_min(
    day: date, scenario_id: str, window_min: int, direction: str
) -> float:
    """Random offset in minutes, rolled once per day per scenario.

    Seeded with date + scenario id: restarts and plan rebuilds never move
    the planned time, and the "next action" display stays stable.
    """
    if window_min <= 0:
        return 0.0
    rnd = random.Random(f"{day.isoformat()}:{scenario_id}")
    if direction == RANDOM_DIRECTION_AFTER:
        return rnd.uniform(0, window_min)
    if direction == RANDOM_DIRECTION_BEFORE:
        return -rnd.uniform(0, window_min)
    return rnd.uniform(-window_min, window_min)


def parse_hh_mm(value: str) -> tuple[int, int] | None:
    """Parse "HH:MM" (or "HH:MM:SS"); return (hour, minute) or ``None``."""
    parts = value.strip().split(":")
    if len(parts) < 2:
        return None
    try:
        hour, minute = int(parts[0]), int(parts[1])
    except ValueError:
        return None
    if not (0 <= hour <= 23 and 0 <= minute <= 59):
        return None
    return hour, minute


def compute_occurrence_times(
    scenario: Scenario,
    day: date,
    tz: Any,
    sun_resolver: Callable[[str, date], datetime | None],
) -> tuple[datetime, datetime] | None:
    """Return (base time, planned time incl. random) for ``day``, or ``None``.

    ``None`` means the scenario has no valid occurrence that day (bad time
    string, sun event unavailable).
    """
    if scenario.trigger.type == TRIGGER_FIXED_TIME:
        parsed = parse_hh_mm(scenario.trigger.time_local)
        if parsed is None:
            return None
        hour, minute = parsed
        base = datetime(day.year, day.month, day.day, hour, minute, tzinfo=tz)
    else:
        sun_time = sun_resolver(scenario.trigger.sun_event, day)
        if sun_time is None:
            return None
        base = sun_time + timedelta(minutes=scenario.trigger.offset_min)

    offset = deterministic_random_offset_min(
        day, scenario.id, scenario.random_window_min, scenario.random_direction
    )
    planned = base + timedelta(minutes=offset)
    return base, planned


def _is_terminal(run: AssignmentRun) -> bool:
    """Return whether a run has a final outcome for today (executed/skipped/…)."""
    return run.status in (RUN_STATE_DONE, RUN_STATE_EXPIRED)


def apply_carryover(
    occ: Occurrence,
    prev_runs: dict[tuple[str, str], AssignmentRun],
    prev_fired: bool,
) -> None:
    """Restore today's already-decided outcomes onto a freshly rebuilt occurrence.

    A plan rebuild (triggered by any config save) recreates every run in the
    idle state. To keep the Today view truthful, this copies the final
    status/result/reason of runs that had already reached a terminal outcome
    earlier today. Runs that were still armed or pending are intentionally left
    idle so the catch-up logic can re-arm or re-fire them.

    ``prev_runs`` is keyed by ``(scenario_id, cover_item_id)``. The occurrence is
    marked ``fired`` only when it had fired before *and* every run is now
    terminal, so a fully-decided scenario is not re-scheduled — while one with a
    newly added cover or a still-armed run stays open.
    """
    for run in occ.runs.values():
        prev = prev_runs.get((occ.scenario_id, run.cover_item_id))
        if prev is not None and _is_terminal(prev):
            run.status = prev.status
            run.result = prev.result
            run.reason = prev.reason
    if prev_fired and occ.runs and all(_is_terminal(r) for r in occ.runs.values()):
        occ.fired = True


@dataclass
class AssignmentRun:
    """Daily state of one (scenario, cover) assignment."""

    cover_item_id: str
    cover_name: str
    target_position: int
    target_tilt: int | None = None
    area_id: str | None = None
    status: str = RUN_STATE_IDLE
    result: str | None = None
    reason: str | None = None
    armed_until: datetime | None = None
    rearm_entity_ids: set[str] = field(default_factory=set)
    unsub_listener: CALLBACK_TYPE | None = field(default=None, repr=False)

    def to_dict(self) -> dict[str, Any]:
        """Serialize for the WebSocket API / sensor attributes."""
        return {
            "cover_item_id": self.cover_item_id,
            "cover_name": self.cover_name,
            "target_position": self.target_position,
            "target_tilt": self.target_tilt,
            "area_id": self.area_id,
            "status": self.status,
            "result": self.result,
            "reason": self.reason,
            "armed_until": (self.armed_until.isoformat() if self.armed_until else None),
            "waiting_for": sorted(self.rearm_entity_ids),
        }


@dataclass
class Occurrence:
    """One planned scenario firing for today."""

    scenario_id: str
    scenario_name: str
    base_at: datetime
    planned_at: datetime
    random_offset_min: float
    retry_until: datetime | None
    fired: bool = False
    runs: dict[str, AssignmentRun] = field(default_factory=dict)
    unsub_expiry: CALLBACK_TYPE | None = field(default=None, repr=False)

    def to_dict(self) -> dict[str, Any]:
        """Serialize for the WebSocket API."""
        return {
            "scenario_id": self.scenario_id,
            "scenario_name": self.scenario_name,
            "base_at": self.base_at.isoformat(),
            "planned_at": self.planned_at.isoformat(),
            "random_offset_min": round(self.random_offset_min, 1),
            "retry_until": self.retry_until.isoformat() if self.retry_until else None,
            "fired": self.fired,
            "assignments": [r.to_dict() for r in self.runs.values()],
        }


class AdvancedCoverScheduler:
    """Own the day plan, trigger timers and re-arm listeners."""

    def __init__(
        self,
        hass: HomeAssistant,
        coordinator: AdvancedCoverCoordinator,
        executor: CoverExecutor,
    ) -> None:
        """Initialize scheduler."""
        self.hass = hass
        self.coordinator = coordinator
        self.executor = executor
        self._plan: list[Occurrence] = []
        self._plan_date: date | None = None
        self._timer_unsub: CALLBACK_TYPE | None = None
        self._midnight_unsub: CALLBACK_TYPE | None = None
        self._started_unsub: CALLBACK_TYPE | None = None
        self._lock = asyncio.Lock()
        self._shutdown = False

    # ------------------------------------------------------------- lifecycle

    async def async_setup(self) -> None:
        """Build today's plan (with restart catch-up) and start timers."""
        if self.hass.state is CoreState.running:
            await self.async_rebuild_plan()
        else:
            # During HA startup other integrations may not have added their
            # entities yet; firing catch-up now would report every cover as
            # unavailable. Build the plan for display only and defer the
            # catch-up until HA has fully started.
            await self.async_rebuild_plan(catch_up=False)

            async def _on_started(_event: Event) -> None:
                self._started_unsub = None
                if self._shutdown:
                    return
                await self.async_rebuild_plan()

            self._started_unsub = self.hass.bus.async_listen_once(
                EVENT_HOMEASSISTANT_STARTED, _on_started
            )
        self._schedule_midnight_rollover()

    async def async_shutdown(self) -> None:
        """Cancel all timers and listeners."""
        self._shutdown = True
        self._cancel_timer()
        if self._midnight_unsub:
            self._midnight_unsub()
            self._midnight_unsub = None
        if self._started_unsub:
            self._started_unsub()
            self._started_unsub = None
        self._teardown_plan()

    def _snapshot_terminal_runs(self) -> dict[tuple[str, str], AssignmentRun]:
        """Capture runs that reached a final outcome, keyed by (scenario, cover).

        Used to preserve today's decided outcomes across a plan rebuild so a
        mid-day config save does not reset them to "skipped".
        """
        return {
            (occ.scenario_id, run.cover_item_id): run
            for occ in self._plan
            for run in occ.runs.values()
            if _is_terminal(run)
        }

    def _teardown_plan(self) -> None:
        """Release all per-occurrence listeners/timers."""
        for occ in self._plan:
            if occ.unsub_expiry:
                occ.unsub_expiry()
                occ.unsub_expiry = None
            for run in occ.runs.values():
                self._disarm(run)

    def _cancel_timer(self) -> None:
        if self._timer_unsub:
            self._timer_unsub()
            self._timer_unsub = None

    def _schedule_midnight_rollover(self) -> None:
        """Rebuild the plan at the next local midnight."""
        if self._midnight_unsub:
            self._midnight_unsub()
        next_midnight = dt_util.start_of_local_day() + timedelta(days=1)

        async def _on_midnight(_now: datetime) -> None:
            self._midnight_unsub = None
            if self._shutdown:
                return
            await self.async_rebuild_plan()
            self._schedule_midnight_rollover()

        self._midnight_unsub = async_track_point_in_time(
            self.hass, _on_midnight, next_midnight
        )

    # ------------------------------------------------------------ plan build

    def _sun_resolver(self, event: str, day: date) -> datetime | None:
        """Resolve a sun event to a local datetime for ``day``."""
        astral_event = _ASTRAL_EVENTS.get(event, event)
        when = get_astral_event_date(self.hass, astral_event, day)
        return dt_util.as_local(when) if when else None

    async def async_rebuild_plan(self, *, catch_up: bool = True) -> None:
        """Recompute today's plan; catch up occurrences with open retry windows."""
        async with self._lock:
            self._cancel_timer()
            now = dt_util.now()
            today = now.date()
            # Snapshot today's already-decided runs before tearing the plan
            # down, so a mid-day config save does not wipe the outcome history.
            # Outcomes never carry across days: at the midnight rollover (or a
            # rebuild after a date change) the previous plan belongs to
            # yesterday and every scenario must start fresh.
            same_day = self._plan_date == today
            prev_runs = self._snapshot_terminal_runs() if same_day else {}
            prev_fired = (
                {occ.scenario_id: occ.fired for occ in self._plan} if same_day else {}
            )
            self._teardown_plan()

            data = self.coordinator.data_model
            tz = dt_util.get_default_time_zone()
            weekday = WEEKDAYS[today.weekday()]

            plan: list[Occurrence] = []
            for scenario in data.scenarios:
                if not scenario.enabled or weekday not in scenario.weekdays:
                    continue
                times = compute_occurrence_times(
                    scenario, today, tz, self._sun_resolver
                )
                if times is None:
                    _LOGGER.warning(
                        "Scenario '%s' has no valid trigger time today; skipped",
                        scenario.name,
                    )
                    continue
                base_at, planned_at = times
                retry_until = (
                    planned_at + timedelta(minutes=scenario.retry_window_min)
                    if scenario.retry_window_min > 0
                    else None
                )
                occ = Occurrence(
                    scenario_id=scenario.id,
                    scenario_name=scenario.name,
                    base_at=base_at,
                    planned_at=planned_at,
                    random_offset_min=(planned_at - base_at).total_seconds() / 60,
                    retry_until=retry_until,
                )
                for assignment in scenario.assignments:
                    cover = data.covers.get(assignment.cover_item_id)
                    if cover is None:
                        continue
                    action = assignment.resolved_action(scenario.action)
                    occ.runs[assignment.cover_item_id] = AssignmentRun(
                        cover_item_id=assignment.cover_item_id,
                        cover_name=cover.name,
                        target_position=action.position,
                        target_tilt=action.tilt_position,
                        area_id=cover.area_id,
                    )
                # Restore outcomes already decided earlier today, so a config
                # save neither re-fires nor loses them.
                apply_carryover(occ, prev_runs, prev_fired.get(scenario.id, False))
                plan.append(occ)

            # Priority = scenario order in the panel; used for deterministic
            # ordering of same-time occurrences.
            priority = {s.id: i for i, s in enumerate(data.scenarios)}
            plan.sort(key=lambda o: (o.planned_at, priority.get(o.scenario_id, 999)))
            self._log_same_minute_conflicts(plan)

            self._plan = plan
            self._plan_date = today
            self.coordinator.set_day_plan(plan)

            # Restart / rebuild catch-up: fire missed occurrences whose retry
            # window is still open; expire the rest. Skipped while HA is still
            # starting up (see async_setup) — the post-startup rebuild does it.
            due_now = self._catch_up_missed(plan, now) if catch_up else []

        await self._async_fire_due(due_now)
        await self._async_schedule_next_timer()
        self.coordinator.notify_plan_changed()

    @staticmethod
    def _catch_up_missed(plan: list[Occurrence], now: datetime) -> list[Occurrence]:
        """Split missed occurrences: due (open retry window) vs. expired."""
        due_now: list[Occurrence] = []
        for occ in plan:
            if occ.planned_at > now:
                continue
            if occ.retry_until and occ.retry_until > now:
                due_now.append(occ)
            else:
                occ.fired = True
                for run in occ.runs.values():
                    if _is_terminal(run):
                        continue  # already decided earlier today
                    run.status = RUN_STATE_EXPIRED
                    run.result = RESULT_EXPIRED
                    run.reason = "trigger time already passed"
        return due_now

    def _log_same_minute_conflicts(self, plan: list[Occurrence]) -> None:
        """Log when two scenarios target the same cover in the same minute."""
        seen: dict[tuple[str, str], str] = {}
        for occ in plan:
            minute = occ.planned_at.strftime("%H:%M")
            for cover_id in occ.runs:
                key = (minute, cover_id)
                if key in seen:
                    _LOGGER.warning(
                        "Scenarios '%s' and '%s' both target cover %s at %s; "
                        "executing in panel order",
                        seen[key],
                        occ.scenario_name,
                        occ.runs[cover_id].cover_name,
                        minute,
                    )
                else:
                    seen[key] = occ.scenario_name
        # (drag order in the panel defines who wins the race)

    # ---------------------------------------------------------------- timers

    async def _async_schedule_next_timer(self) -> None:
        """Arm one timer for the earliest unfired occurrence."""
        self._cancel_timer()
        now = dt_util.now()
        upcoming = [o for o in self._plan if not o.fired and o.planned_at > now]
        if not upcoming:
            return
        when = min(o.planned_at for o in upcoming)

        async def _on_fire(_now: datetime) -> None:
            self._timer_unsub = None
            if self._shutdown:
                return
            fire_now = dt_util.now()
            due = [
                o
                for o in self._plan
                if not o.fired and o.planned_at <= fire_now + timedelta(seconds=1)
            ]
            await self._async_fire_due(due)
            await self._async_schedule_next_timer()
            self.coordinator.notify_plan_changed()

        self._timer_unsub = async_track_point_in_time(
            self.hass, _on_fire, dt_util.as_utc(when)
        )

    # ------------------------------------------------------------- execution

    def _get_state(self, entity_id: str) -> str | None:
        """State-machine accessor for the pure engine."""
        state = self.hass.states.get(entity_id)
        return state.state if state else None

    def _cover_context(self, cover: CoverItem) -> CoverContext:
        """Build the engine's cover snapshot."""
        position = current_cover_position(self.hass.states.get(cover.cover_entity_id))
        contact = resolve_contact_state(
            self._get_state(cover.contact_entity_id)
            if cover.contact_entity_id
            else None,
            cover.contact_state_map,
        )
        return CoverContext(
            position=position,
            contact=contact,
            contact_entity_id=cover.contact_entity_id,
        )

    def _scenario_and_assignment(
        self, occ: Occurrence, cover_item_id: str
    ) -> tuple[Scenario, Assignment] | None:
        """Look up current scenario + assignment for an occurrence run."""
        scenario = self.coordinator.data_model.scenario_by_id(occ.scenario_id)
        if scenario is None:
            return None
        assignment = next(
            (a for a in scenario.assignments if a.cover_item_id == cover_item_id),
            None,
        )
        if assignment is None:
            return None
        return scenario, assignment

    async def _async_fire_due(self, occurrences: list[Occurrence]) -> None:
        """Fire due occurrences under the lock, in plan (priority) order."""
        if not occurrences:
            return
        async with self._lock:
            for occ in occurrences:
                if occ.fired:
                    continue
                occ.fired = True
                for run in occ.runs.values():
                    await self._async_evaluate_run(occ, run, first_fire=True)
                self._ensure_expiry_timer(occ)
        self.coordinator.notify_plan_changed()

    async def _async_evaluate_run(
        self, occ: Occurrence, run: AssignmentRun, *, first_fire: bool
    ) -> None:
        """Evaluate one assignment; execute, arm or finish it."""
        if _is_terminal(run):
            return
        looked_up = self._scenario_and_assignment(occ, run.cover_item_id)
        if looked_up is None:
            self._finish_run(occ, run, RESULT_SKIPPED, "scenario or assignment removed")
            return
        scenario, assignment = looked_up
        cover = self.coordinator.cover_by_id(run.cover_item_id)
        if cover is None:
            self._finish_run(occ, run, RESULT_SKIPPED, "cover removed")
            return
        if not self.coordinator.data_model.config.enabled:
            self._finish_run(occ, run, RESULT_SKIPPED, "master switch is off")
            return
        if not cover.enabled:
            self._finish_run(occ, run, RESULT_SKIPPED, "cover automation is off")
            return

        conditions = [*scenario.conditions, *assignment.extra_conditions]
        evaluation = evaluate_conditions(
            conditions, self._get_state, self._cover_context(cover)
        )

        if evaluation.passed:
            self._disarm(run)
            outcome = await self.executor.async_execute(
                cover, assignment.resolved_action(scenario.action)
            )
            if (
                outcome.result == RESULT_UNAVAILABLE
                and outcome.unavailable_entity_id
                and occ.retry_until is not None
                and dt_util.now() < occ.retry_until
            ):
                # The target entity is missing/unavailable (e.g. its
                # integration is still loading). Within the retry window,
                # wait for it to come back instead of giving up for the day.
                reason = outcome.reason or (
                    f"{outcome.unavailable_entity_id} is unavailable"
                )
                self._arm_run(occ, run, {outcome.unavailable_entity_id}, reason)
                if first_fire:
                    self._log_run(occ, run, RESULT_ARMED, reason)
                return
            self._finish_run(occ, run, outcome.result, outcome.reason)
            return

        reason = "; ".join(evaluation.failed_reasons)
        now = dt_util.now()
        can_arm = (
            occ.retry_until is not None
            and now < occ.retry_until
            and bool(evaluation.rearm_entity_ids)
        )
        if can_arm:
            self._arm_run(occ, run, evaluation.rearm_entity_ids, reason)
            if first_fire:
                self._log_run(occ, run, RESULT_ARMED, reason)
            return

        if occ.retry_until is not None and now < occ.retry_until and not first_fire:
            # Still inside the window but nothing external left to wait for
            # (e.g. only a cover_position condition fails): stay armed on the
            # current listener set, but do not extend it.
            run.reason = reason
            return

        self._finish_run(occ, run, RESULT_SKIPPED, reason)

    def _finish_run(
        self, occ: Occurrence, run: AssignmentRun, result: str, reason: str | None
    ) -> None:
        """Mark a run done for today and log the outcome."""
        self._disarm(run)
        run.status = RUN_STATE_DONE
        run.result = result
        run.reason = reason
        run.armed_until = None
        self._log_run(occ, run, result, reason)

    def _log_run(
        self, occ: Occurrence, run: AssignmentRun, result: str, reason: str | None
    ) -> None:
        """Write to the coordinator's action log + event bus."""
        self.coordinator.log_action(
            scenario_id=occ.scenario_id,
            scenario_name=occ.scenario_name,
            cover_item_id=run.cover_item_id,
            cover_name=run.cover_name,
            result=result,
            reason=reason,
            position=run.target_position,
        )

    # ----------------------------------------------------------------- re-arm

    def _arm_run(
        self,
        occ: Occurrence,
        run: AssignmentRun,
        rearm_entity_ids: set[str],
        reason: str,
    ) -> None:
        """Put a run into armed state, listening to failed external entities."""
        run.status = RUN_STATE_ARMED
        run.reason = reason
        run.armed_until = occ.retry_until
        if rearm_entity_ids != run.rearm_entity_ids or run.unsub_listener is None:
            self._disarm(run, keep_status=True)
            run.rearm_entity_ids = set(rearm_entity_ids)

            @callback
            def _on_state_change(_event: Event[EventStateChangedData]) -> None:
                self.hass.async_create_task(
                    self._async_rearm_check(occ, run),
                    name=f"{occ.scenario_name} re-arm check",
                )

            run.unsub_listener = async_track_state_change_event(
                self.hass, sorted(rearm_entity_ids), _on_state_change
            )

    async def _async_rearm_check(self, occ: Occurrence, run: AssignmentRun) -> None:
        """Re-evaluate an armed run after one of its entities changed."""
        async with self._lock:
            if self._shutdown or run.status != RUN_STATE_ARMED:
                return
            now = dt_util.now()
            if occ.retry_until is None or now >= occ.retry_until:
                self._expire_run(occ, run)
            else:
                await self._async_evaluate_run(occ, run, first_fire=False)
        self.coordinator.notify_plan_changed()

    def _disarm(self, run: AssignmentRun, *, keep_status: bool = False) -> None:
        """Remove the state-change listener of a run."""
        if run.unsub_listener:
            run.unsub_listener()
            run.unsub_listener = None
        if not keep_status:
            run.rearm_entity_ids = set()

    def _ensure_expiry_timer(self, occ: Occurrence) -> None:
        """Arm the expiry timer if any run of the occurrence is armed."""
        if occ.unsub_expiry or occ.retry_until is None:
            return
        if not any(r.status == RUN_STATE_ARMED for r in occ.runs.values()):
            return

        async def _on_expiry(_now: datetime) -> None:
            occ.unsub_expiry = None
            if self._shutdown:
                return
            async with self._lock:
                for run in occ.runs.values():
                    if run.status == RUN_STATE_ARMED:
                        self._expire_run(occ, run)
            self.coordinator.notify_plan_changed()

        occ.unsub_expiry = async_track_point_in_time(
            self.hass, _on_expiry, dt_util.as_utc(occ.retry_until)
        )

    def _expire_run(self, occ: Occurrence, run: AssignmentRun) -> None:
        """Retry window ended without the conditions being met."""
        self._disarm(run)
        run.status = RUN_STATE_EXPIRED
        run.result = RESULT_EXPIRED
        run.armed_until = None
        self._log_run(occ, run, RESULT_EXPIRED, run.reason)

    # ------------------------------------------------------------ manual runs

    async def async_run_scenario(
        self,
        scenario_id: str,
        *,
        cover_item_id: str | None = None,
        ignore_conditions: bool = False,
    ) -> None:
        """Run a scenario now (panel "Run now" / service call).

        Manual runs are ephemeral: they neither consume nor mark today's
        planned occurrence.
        """
        data = self.coordinator.data_model
        scenario = data.scenario_by_id(scenario_id)
        if scenario is None:
            raise ValueError(f"Unknown scenario: {scenario_id}")

        for assignment in scenario.assignments:
            if cover_item_id and assignment.cover_item_id != cover_item_id:
                continue
            cover = data.covers.get(assignment.cover_item_id)
            if cover is None:
                continue
            result: str
            reason: str | None
            position = assignment.resolved_action(scenario.action).position
            if not ignore_conditions:
                conditions = [*scenario.conditions, *assignment.extra_conditions]
                evaluation = evaluate_conditions(
                    conditions, self._get_state, self._cover_context(cover)
                )
                if not evaluation.passed:
                    result = RESULT_SKIPPED
                    reason = "; ".join(evaluation.failed_reasons)
                    self.coordinator.log_action(
                        scenario_id=scenario.id,
                        scenario_name=f"{scenario.name} (manual)",
                        cover_item_id=cover.id,
                        cover_name=cover.name,
                        result=result,
                        reason=reason,
                        position=position,
                    )
                    continue
            outcome = await self.executor.async_execute(
                cover, assignment.resolved_action(scenario.action)
            )
            self.coordinator.log_action(
                scenario_id=scenario.id,
                scenario_name=f"{scenario.name} (manual)",
                cover_item_id=cover.id,
                cover_name=cover.name,
                result=outcome.result,
                reason=outcome.reason,
                position=outcome.position,
            )

    # -------------------------------------------------------------- reporting

    def next_action_for_cover(self, cover_item_id: str) -> dict[str, Any] | None:
        """Earliest pending/armed action for one cover today."""
        now = dt_util.now()
        # The plan is sorted by time; an armed run (already fired, waiting
        # for its conditions) takes precedence over later planned runs.
        for occ in self._plan:
            run = occ.runs.get(cover_item_id)
            if run is None:
                continue
            if run.status == RUN_STATE_ARMED:
                return {
                    "when": occ.planned_at.isoformat(),
                    "scenario_id": occ.scenario_id,
                    "scenario_name": occ.scenario_name,
                    "position": run.target_position,
                    "armed": True,
                    "armed_until": (
                        run.armed_until.isoformat() if run.armed_until else None
                    ),
                    "waiting_for": sorted(run.rearm_entity_ids),
                }
        for occ in self._plan:
            run = occ.runs.get(cover_item_id)
            if run is None:
                continue
            if run.status == RUN_STATE_IDLE and not occ.fired and occ.planned_at >= now:
                return {
                    "when": occ.planned_at.isoformat(),
                    "scenario_id": occ.scenario_id,
                    "scenario_name": occ.scenario_name,
                    "position": run.target_position,
                    "armed": False,
                }
        return None

    def next_action_global(self) -> dict[str, Any] | None:
        """Earliest pending action across all covers today."""
        now = dt_util.now()
        for occ in self._plan:  # plan is sorted by time
            if occ.fired or occ.planned_at < now or not occ.runs:
                continue
            return {
                "when": occ.planned_at.isoformat(),
                "scenario_id": occ.scenario_id,
                "scenario_name": occ.scenario_name,
                "covers": [r.cover_name for r in occ.runs.values()],
            }
        return None
