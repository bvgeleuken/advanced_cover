"""Tests for the pure scheduler helpers (no Home Assistant core needed)."""

from __future__ import annotations

from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

from custom_components.advanced_cover.const import (
    RESULT_EXECUTED,
    RESULT_SKIPPED,
    RUN_STATE_ARMED,
    RUN_STATE_DONE,
    RUN_STATE_IDLE,
)
from custom_components.advanced_cover.models import Scenario, Trigger
from custom_components.advanced_cover.scheduler import (
    AssignmentRun,
    Occurrence,
    apply_carryover,
    compute_occurrence_times,
    deterministic_random_offset_min,
    parse_hh_mm,
)

TZ = ZoneInfo("Europe/Berlin")
DAY = date(2026, 7, 3)


def no_sun(_event: str, _day: date):
    return None


def sun_at(hour: int, minute: int = 0):
    def resolver(_event: str, day: date) -> datetime:
        return datetime(day.year, day.month, day.day, hour, minute, tzinfo=TZ)

    return resolver


# ------------------------------------------------------------------ parse_hh_mm


def test_parse_hh_mm():
    assert parse_hh_mm("07:30") == (7, 30)
    assert parse_hh_mm("23:59:59") == (23, 59)
    assert parse_hh_mm("24:00") is None
    assert parse_hh_mm("7") is None
    assert parse_hh_mm("ab:cd") is None


# ------------------------------------------------------- deterministic random


def test_random_offset_is_deterministic_per_day_and_scenario():
    a = deterministic_random_offset_min(DAY, "s1", 30, "both")
    b = deterministic_random_offset_min(DAY, "s1", 30, "both")
    assert a == b
    other_day = deterministic_random_offset_min(date(2026, 7, 4), "s1", 30, "both")
    other_scenario = deterministic_random_offset_min(DAY, "s2", 30, "both")
    assert a != other_day or a != other_scenario  # seeds differ


def test_random_offset_respects_direction_and_window():
    for day_num in range(1, 28):
        d = date(2026, 7, day_num)
        after = deterministic_random_offset_min(d, "s1", 20, "after")
        before = deterministic_random_offset_min(d, "s1", 20, "before")
        both = deterministic_random_offset_min(d, "s1", 20, "both")
        assert 0 <= after <= 20
        assert -20 <= before <= 0
        assert -20 <= both <= 20


def test_random_offset_zero_window():
    assert deterministic_random_offset_min(DAY, "s1", 0, "both") == 0.0


# --------------------------------------------------- compute_occurrence_times


def test_fixed_time_occurrence():
    scenario = Scenario(
        id="s1", name="X", trigger=Trigger(type="fixed_time", time_local="13:00")
    )
    result = compute_occurrence_times(scenario, DAY, TZ, no_sun)
    assert result is not None
    base, planned = result
    assert base == datetime(2026, 7, 3, 13, 0, tzinfo=TZ)
    assert planned == base  # no random window


def test_fixed_time_invalid_returns_none():
    scenario = Scenario(
        id="s1", name="X", trigger=Trigger(type="fixed_time", time_local="nope")
    )
    assert compute_occurrence_times(scenario, DAY, TZ, no_sun) is None


def test_sun_event_with_offset():
    scenario = Scenario(
        id="s1",
        name="X",
        trigger=Trigger(type="sun_event", sun_event="sunset", offset_min=-10),
    )
    result = compute_occurrence_times(scenario, DAY, TZ, sun_at(21, 30))
    assert result is not None
    base, planned = result
    assert base == datetime(2026, 7, 3, 21, 20, tzinfo=TZ)
    assert planned == base


def test_sun_event_unavailable_returns_none():
    scenario = Scenario(
        id="s1", name="X", trigger=Trigger(type="sun_event", sun_event="sunset")
    )
    assert compute_occurrence_times(scenario, DAY, TZ, no_sun) is None


def test_random_window_shifts_planned_but_not_base():
    scenario = Scenario(
        id="s1",
        name="X",
        trigger=Trigger(type="fixed_time", time_local="13:00"),
        random_window_min=30,
        random_direction="after",
    )
    result = compute_occurrence_times(scenario, DAY, TZ, no_sun)
    assert result is not None
    base, planned = result
    assert base == datetime(2026, 7, 3, 13, 0, tzinfo=TZ)
    delta_min = (planned - base).total_seconds() / 60
    assert 0 <= delta_min <= 30
    # And stable across recomputation:
    assert compute_occurrence_times(scenario, DAY, TZ, no_sun)[1] == planned


# --------------------------------------------------------------- apply_carryover


def make_run(cover_id: str, **kwargs) -> AssignmentRun:
    run = AssignmentRun(cover_item_id=cover_id, cover_name=cover_id, target_position=0)
    for key, value in kwargs.items():
        setattr(run, key, value)
    return run


def make_occ(scenario_id: str, runs: list[AssignmentRun]) -> Occurrence:
    at = datetime(2026, 7, 3, 20, 0, tzinfo=TZ)
    occ = Occurrence(
        scenario_id=scenario_id,
        scenario_name=scenario_id,
        base_at=at,
        planned_at=at,
        random_offset_min=0.0,
        retry_until=None,
    )
    occ.runs = {r.cover_item_id: r for r in runs}
    return occ


def test_carryover_restores_terminal_outcomes():
    # Fresh rebuild: run starts idle...
    occ = make_occ("s1", [make_run("c1")])
    # ...but earlier today it had already executed.
    prev = {
        ("s1", "c1"): make_run(
            "c1", status=RUN_STATE_DONE, result=RESULT_EXECUTED, reason="ok"
        )
    }
    apply_carryover(occ, prev, prev_fired=True)
    run = occ.runs["c1"]
    assert run.status == RUN_STATE_DONE
    assert run.result == RESULT_EXECUTED
    assert run.reason == "ok"
    assert occ.fired is True  # fully decided -> not re-scheduled


def test_carryover_restores_skipped_reason():
    occ = make_occ("s1", [make_run("c1")])
    prev = {
        ("s1", "c1"): make_run(
            "c1", status=RUN_STATE_DONE, result=RESULT_SKIPPED, reason="window open"
        )
    }
    apply_carryover(occ, prev, prev_fired=True)
    assert occ.runs["c1"].result == RESULT_SKIPPED
    assert occ.runs["c1"].reason == "window open"


def test_carryover_ignores_non_terminal_prev_runs():
    # A run that was still armed must NOT be frozen; it stays idle so the
    # catch-up logic can re-arm it after the rebuild.
    occ = make_occ("s1", [make_run("c1")])
    prev = {("s1", "c1"): make_run("c1", status=RUN_STATE_ARMED, reason="waiting")}
    apply_carryover(occ, prev, prev_fired=True)
    assert occ.runs["c1"].status == RUN_STATE_IDLE
    assert occ.runs["c1"].result is None
    assert occ.fired is False  # not fully decided


def test_carryover_partial_occurrence_stays_open():
    # Scenario already fired for c1, but c2 was newly added: keep c1's result,
    # leave the occurrence unfired so c2 can still run.
    occ = make_occ("s1", [make_run("c1"), make_run("c2")])
    prev = {("s1", "c1"): make_run("c1", status=RUN_STATE_DONE, result=RESULT_EXECUTED)}
    apply_carryover(occ, prev, prev_fired=True)
    assert occ.runs["c1"].result == RESULT_EXECUTED
    assert occ.runs["c2"].status == RUN_STATE_IDLE
    assert occ.fired is False


def test_carryover_does_not_fire_when_never_fired_before():
    occ = make_occ("s1", [make_run("c1")])
    prev = {("s1", "c1"): make_run("c1", status=RUN_STATE_DONE, result=RESULT_EXECUTED)}
    apply_carryover(occ, prev, prev_fired=False)
    # Outcome is still restored...
    assert occ.runs["c1"].result == RESULT_EXECUTED
    # ...but we don't invent a fired flag it never had.
    assert occ.fired is False


def test_carryover_no_prev_is_noop():
    occ = make_occ("s1", [make_run("c1")])
    apply_carryover(occ, {}, prev_fired=False)
    assert occ.runs["c1"].status == RUN_STATE_IDLE
    assert occ.fired is False


# ------------------------------------------------------ sun position triggers


def test_sun_azimuth_trigger_uses_position_resolver():
    scenario = Scenario(
        id="s-az",
        name="South",
        trigger=Trigger(type="sun_azimuth", azimuth_deg=180, offset_min=10),
    )
    resolved = datetime(2026, 7, 3, 13, 11, tzinfo=TZ)

    def resolver(trigger, day):
        assert trigger.azimuth_deg == 180
        assert day == DAY
        return resolved

    base, planned = compute_occurrence_times(scenario, DAY, TZ, no_sun, resolver)
    assert base == resolved + timedelta(minutes=10)
    assert planned == base


def test_sun_position_trigger_without_resolver_returns_none():
    scenario = Scenario(
        id="s-el", name="Low sun", trigger=Trigger(type="sun_elevation")
    )
    assert compute_occurrence_times(scenario, DAY, TZ, no_sun) is None


def test_sun_position_trigger_no_crossing_returns_none():
    scenario = Scenario(
        id="s-el2",
        name="Never",
        trigger=Trigger(type="sun_elevation", elevation_deg=80.0),
    )
    assert (
        compute_occurrence_times(scenario, DAY, TZ, no_sun, lambda _t, _d: None) is None
    )


# --------------------------------------------- facade-relative azimuth trigger


def _rel_scenario(**kwargs):
    from custom_components.advanced_cover.models import Trigger

    defaults = {
        "id": "s-rel",
        "name": "Facade",
        "trigger": Trigger(
            type="sun_azimuth", az_relative=True, azimuth_offset_deg=-45
        ),
    }
    defaults.update(kwargs)
    return Scenario(**defaults)


def _resolver_from(table):
    """Crossing resolver stub: target degrees -> fixed local datetime."""

    def resolver(target):
        return table.get(target)

    return resolver


def test_relative_occurrence_per_cover_times():
    from custom_components.advanced_cover.scheduler import (
        compute_relative_occurrence,
    )

    scenario = _rel_scenario()
    east = datetime(2026, 7, 3, 8, 30, tzinfo=TZ)
    south = datetime(2026, 7, 3, 12, 15, tzinfo=TZ)
    table = {(90 - 45) % 360: east, (180 - 45) % 360: south}
    result = compute_relative_occurrence(
        scenario,
        DAY,
        {"c-east": 90, "c-south": 180, "c-none": None},
        _resolver_from(table),
    )
    assert result is not None
    base, planned, retry_until, fire_ats = result
    assert base == east
    assert planned == east  # no random window
    assert fire_ats == {"c-east": east, "c-south": south}
    assert "c-none" not in fire_ats
    # Grace keeps the occurrence open past the LAST cover's time.
    assert retry_until > south


def test_relative_occurrence_shifts_all_covers_by_same_random_offset():
    from custom_components.advanced_cover.scheduler import (
        compute_relative_occurrence,
    )

    scenario = _rel_scenario(random_window_min=30)
    east = datetime(2026, 7, 3, 8, 30, tzinfo=TZ)
    south = datetime(2026, 7, 3, 12, 15, tzinfo=TZ)
    table = {45: east, 135: south}
    result = compute_relative_occurrence(
        scenario, DAY, {"c-east": 90, "c-south": 180}, _resolver_from(table)
    )
    assert result is not None
    base, planned, _retry, fire_ats = result
    shift = planned - base
    assert fire_ats["c-east"] - east == shift
    assert fire_ats["c-south"] - south == shift
    # The facade spread is preserved exactly.
    assert fire_ats["c-south"] - fire_ats["c-east"] == south - east


def test_relative_occurrence_none_without_any_crossing():
    from custom_components.advanced_cover.scheduler import (
        compute_relative_occurrence,
    )

    scenario = _rel_scenario()
    assert (
        compute_relative_occurrence(
            scenario, DAY, {"c1": 90, "c2": None}, _resolver_from({})
        )
        is None
    )


def test_relative_occurrence_offset_min_applies():
    from custom_components.advanced_cover.models import Trigger
    from custom_components.advanced_cover.scheduler import (
        compute_relative_occurrence,
    )

    scenario = _rel_scenario(
        trigger=Trigger(
            type="sun_azimuth", az_relative=True, azimuth_offset_deg=0, offset_min=20
        )
    )
    south = datetime(2026, 7, 3, 12, 0, tzinfo=TZ)
    result = compute_relative_occurrence(
        scenario, DAY, {"c-south": 180}, _resolver_from({180: south})
    )
    assert result is not None
    base, _planned, _retry, fire_ats = result
    assert base == south + timedelta(minutes=20)
    assert fire_ats["c-south"] == base
