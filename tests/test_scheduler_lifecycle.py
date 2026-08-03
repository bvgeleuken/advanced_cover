"""Behavioral scheduler tests: midnight rollover, unavailable re-arm, startup.

These use the real Home Assistant test instance (timers, event bus, state
machine) with a stub coordinator/executor, so they cover the plan lifecycle
end to end.
"""

from __future__ import annotations

from typing import Any

from custom_components.advanced_cover.const import (
    RESULT_EXECUTED,
    RESULT_UNAVAILABLE,
    RUN_STATE_ARMED,
    RUN_STATE_DONE,
    RUN_STATE_EXPIRED,
    RUN_STATE_IDLE,
)
from custom_components.advanced_cover.executor import ExecutionOutcome
from custom_components.advanced_cover.models import (
    Assignment,
    CoverItem,
    EntryData,
    Scenario,
    Trigger,
)
from custom_components.advanced_cover.scheduler import AdvancedCoverScheduler
from homeassistant.const import EVENT_HOMEASSISTANT_STARTED
from homeassistant.core import CoreState, HomeAssistant


class StubCoordinator:
    """Minimal coordinator surface used by the scheduler."""

    def __init__(self, data: EntryData) -> None:
        self.data_model = data
        self.plan: list[Any] = []
        self.logs: list[dict[str, Any]] = []

    def set_day_plan(self, plan: list[Any]) -> None:
        self.plan = plan

    def notify_plan_changed(self) -> None:
        pass

    def log_action(self, **kwargs: Any) -> None:
        self.logs.append(kwargs)

    def cover_by_id(self, cover_item_id: str):
        return self.data_model.covers.get(cover_item_id)


class StubExecutor:
    """Returns queued outcomes and counts calls."""

    def __init__(self, *outcomes: ExecutionOutcome) -> None:
        self.outcomes = list(outcomes)
        self.calls = 0

    async def async_execute(self, cover, action) -> ExecutionOutcome:
        self.calls += 1
        return self.outcomes.pop(0)


async def use_utc(hass: HomeAssistant) -> None:
    """Pin the instance to UTC so wall-clock literals below are unambiguous."""
    await hass.config.async_set_time_zone("UTC")


def make_data(*, retry_window_min: int = 0, time_local: str = "08:00") -> EntryData:
    cover = CoverItem(id="c1", name="Cover", cover_entity_id="cover.test")
    scenario = Scenario(
        id="s1",
        name="Scenario",
        trigger=Trigger(type="fixed_time", time_local=time_local),
        retry_window_min=retry_window_min,
        assignments=[Assignment(cover_item_id="c1")],
    )
    return EntryData(covers={"c1": cover}, scenarios=[scenario])


async def test_midnight_rollover_starts_fresh(hass: HomeAssistant, freezer) -> None:
    """Yesterday's outcomes must not leak into a new day's plan."""
    await use_utc(hass)
    freezer.move_to("2026-07-03 12:00:00+00:00")
    coordinator = StubCoordinator(make_data())
    scheduler = AdvancedCoverScheduler(hass, coordinator, StubExecutor())
    await scheduler.async_rebuild_plan()

    occ = coordinator.plan[0]
    assert occ.fired is True
    assert occ.runs["c1"].status == RUN_STATE_EXPIRED

    # Same-day rebuild (config save): outcomes are carried over.
    await scheduler.async_rebuild_plan()
    occ = coordinator.plan[0]
    assert occ.fired is True
    assert occ.runs["c1"].status == RUN_STATE_EXPIRED

    # Next day (midnight rollover / rebuild after a date change): fresh plan.
    freezer.move_to("2026-07-04 00:00:30+00:00")
    await scheduler.async_rebuild_plan()
    occ = coordinator.plan[0]
    assert occ.fired is False
    assert occ.runs["c1"].status == RUN_STATE_IDLE
    assert occ.runs["c1"].result is None

    await scheduler.async_shutdown()


async def test_unavailable_within_retry_window_arms_and_recovers(
    hass: HomeAssistant, freezer
) -> None:
    """An unavailable target entity re-arms and executes once it comes back."""
    await use_utc(hass)
    freezer.move_to("2026-07-03 08:10:00+00:00")
    executor = StubExecutor(
        ExecutionOutcome(
            RESULT_UNAVAILABLE,
            "cover.test is unavailable",
            0,
            unavailable_entity_id="cover.test",
        ),
        ExecutionOutcome(RESULT_EXECUTED, None, 0),
    )
    coordinator = StubCoordinator(make_data(retry_window_min=60))
    scheduler = AdvancedCoverScheduler(hass, coordinator, executor)
    await scheduler.async_rebuild_plan()
    await hass.async_block_till_done()

    run = coordinator.plan[0].runs["c1"]
    assert run.status == RUN_STATE_ARMED
    assert run.rearm_entity_ids == {"cover.test"}

    hass.states.async_set("cover.test", "open")
    await hass.async_block_till_done()

    run = coordinator.plan[0].runs["c1"]
    assert run.status == RUN_STATE_DONE
    assert run.result == RESULT_EXECUTED
    assert executor.calls == 2

    await scheduler.async_shutdown()


async def test_unavailable_without_retry_window_finishes(
    hass: HomeAssistant, freezer
) -> None:
    """No retry window: unavailable stays a terminal outcome."""
    await use_utc(hass)
    freezer.move_to("2026-07-03 08:10:00+00:00")
    executor = StubExecutor(
        ExecutionOutcome(
            RESULT_UNAVAILABLE,
            "cover.test is unavailable",
            0,
            unavailable_entity_id="cover.test",
        ),
    )
    coordinator = StubCoordinator(make_data(retry_window_min=0))
    scheduler = AdvancedCoverScheduler(hass, coordinator, executor)
    await scheduler.async_rebuild_plan()

    occ = coordinator.plan[0]
    # Planned time passed and no retry window -> expired without execution.
    assert occ.runs["c1"].status == RUN_STATE_EXPIRED
    assert executor.calls == 0

    await scheduler.async_shutdown()


async def test_startup_defers_catchup_until_started(
    hass: HomeAssistant, freezer
) -> None:
    """During HA startup nothing fires; the post-startup rebuild catches up."""
    await use_utc(hass)
    freezer.move_to("2026-07-03 12:00:00+00:00")
    hass.set_state(CoreState.starting)
    coordinator = StubCoordinator(make_data())
    executor = StubExecutor()
    scheduler = AdvancedCoverScheduler(hass, coordinator, executor)
    await scheduler.async_setup()

    occ = coordinator.plan[0]
    assert occ.fired is False
    assert occ.runs["c1"].status == RUN_STATE_IDLE

    hass.set_state(CoreState.running)
    hass.bus.async_fire(EVENT_HOMEASSISTANT_STARTED)
    await hass.async_block_till_done()

    occ = coordinator.plan[0]
    assert occ.fired is True
    assert occ.runs["c1"].status == RUN_STATE_EXPIRED
    assert executor.calls == 0

    await scheduler.async_shutdown()
