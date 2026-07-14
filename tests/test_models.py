"""Tests for the domain models (serialization, clamping, merging)."""

from __future__ import annotations

from custom_components.advanced_cover.models import (
    ActionOverride,
    Assignment,
    Condition,
    CoverAction,
    CoverItem,
    EntryData,
    Scenario,
    Trigger,
)


def test_scenario_round_trip():
    scenario = Scenario(
        id="s1",
        name="Sunset close",
        trigger=Trigger(type="sun_event", sun_event="sunset", offset_min=-10),
        random_window_min=15,
        random_direction="after",
        weekdays=["mon", "sat"],
        conditions=[
            Condition(
                type="entity_state",
                entity_id="input_select.weather",
                states=["sunny", "partly_sunny"],
            )
        ],
        retry_window_min=240,
        action=CoverAction(position=0, tilt_position=50, mode="low"),
        assignments=[
            Assignment(
                cover_item_id="c1",
                extra_conditions=[
                    Condition(type="cover_position", op="above", value=5)
                ],
                action_override=ActionOverride(position=25),
            )
        ],
    )
    restored = Scenario.from_dict(scenario.to_dict())
    assert restored.to_dict() == scenario.to_dict()
    assert restored.trigger.sun_event == "sunset"
    assert restored.assignments[0].action_override.position == 25


def test_scenario_defensive_defaults():
    restored = Scenario.from_dict(
        {
            "name": "X",
            "trigger": {"type": "bogus"},
            "random_window_min": 9999,
            "random_direction": "sideways",
            "weekdays": ["mon", "funday"],
            "retry_window_min": -5,
            "action": {"position": 250, "mode": "turbo"},
        }
    )
    assert restored.trigger.type == "fixed_time"
    assert restored.random_window_min == 120  # clamped to max
    assert restored.random_direction == "both"
    assert restored.weekdays == ["mon"]
    assert restored.retry_window_min == 0
    assert restored.action.position == 100
    assert restored.action.mode == "normal"
    assert restored.id  # auto-generated


def test_empty_weekdays_means_all():
    restored = Scenario.from_dict({"name": "X", "weekdays": []})
    assert len(restored.weekdays) == 7


def test_resolved_action_merges_override():
    default = CoverAction(position=0, tilt_position=30, mode="normal")
    assignment = Assignment(
        cover_item_id="c1", action_override=ActionOverride(position=25)
    )
    resolved = assignment.resolved_action(default)
    assert resolved.position == 25
    assert resolved.tilt_position == 30  # inherited
    assert resolved.mode == "normal"


def test_resolved_action_without_override_is_default():
    default = CoverAction(position=40)
    assignment = Assignment(cover_item_id="c1")
    assert assignment.resolved_action(default) is default


def test_empty_override_is_dropped_on_load():
    a = Assignment.from_dict(
        {
            "cover_item_id": "c1",
            "action_override": {
                "position": None,
                "tilt_position": None,
                "mode": None,
                "min_position_delta": None,
            },
        }
    )
    assert a.action_override is None


def test_cover_item_round_trip_and_contact_map_filtering():
    cover = CoverItem.from_dict(
        {
            "name": "Kitchen",
            "cover_entity_id": "cover.kitchen",
            "kind": "shutter",
            "azimuth": 400,
            "contact_state_map": {"on": "open", "off": "closed", "x": "bogus"},
        }
    )
    assert cover.azimuth == 359  # clamped
    assert cover.contact_state_map == {"on": "open", "off": "closed"}
    restored = CoverItem.from_dict(cover.to_dict())
    assert restored.to_dict() == cover.to_dict()


def test_entry_data_round_trip():
    data = EntryData.from_dict(
        {
            "config": {"name": "Home", "default_min_position_delta": 5},
            "covers": {"c1": {"id": "c1", "name": "A", "cover_entity_id": "cover.a"}},
            "scenarios": [{"id": "s1", "name": "S"}],
        }
    )
    assert data.config.default_min_position_delta == 5
    assert data.scenario_by_id("s1") is not None
    assert data.scenario_by_id("nope") is None
    assert EntryData.from_dict(data.to_dict()).to_dict() == data.to_dict()


def test_condition_external_entities():
    assert Condition(
        type="entity_state", entity_id="sensor.x", states=["on"]
    ).external_entity_ids() == ["sensor.x"]
    assert (
        Condition(type="cover_position", op="above", value=5).external_entity_ids()
        == []
    )
    assert Condition(
        type="numeric_state", entity_id="sensor.lux", above=100
    ).external_entity_ids() == ["sensor.lux"]
