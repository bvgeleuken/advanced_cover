"""Tests for the pure scheduler helpers (no Home Assistant core needed)."""

from __future__ import annotations

from datetime import date, datetime
from zoneinfo import ZoneInfo

from custom_components.advanced_cover.models import Scenario, Trigger
from custom_components.advanced_cover.scheduler import (
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
