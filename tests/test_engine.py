"""Tests for the pure condition engine."""

from __future__ import annotations

from custom_components.advanced_cover.engine import (
    CoverContext,
    evaluate_condition,
    evaluate_conditions,
)
from custom_components.advanced_cover.models import Condition

CTX = CoverContext(position=50, contact="closed", contact_entity_id="sensor.contact")


def states(mapping):
    return mapping.get


# ---------------------------------------------------------------- entity_state


def test_entity_state_pass_and_fail():
    cond = Condition(type="entity_state", entity_id="s.w", states=["sunny"])
    assert evaluate_condition(cond, states({"s.w": "sunny"}), CTX) is None
    assert evaluate_condition(cond, states({"s.w": "cloudy"}), CTX) is not None


def test_entity_state_multiple_states_is_or():
    cond = Condition(
        type="entity_state", entity_id="s.w", states=["sunny", "partly_sunny"]
    )
    assert evaluate_condition(cond, states({"s.w": "partly_sunny"}), CTX) is None


def test_entity_state_unavailable_fails_safe():
    cond = Condition(type="entity_state", entity_id="s.w", states=["sunny"])
    for bad in ("unavailable", "unknown", None):
        assert evaluate_condition(cond, states({"s.w": bad}), CTX) is not None


def test_entity_state_not():
    cond = Condition(type="entity_state_not", entity_id="s.w", states=["rainy"])
    assert evaluate_condition(cond, states({"s.w": "sunny"}), CTX) is None
    assert evaluate_condition(cond, states({"s.w": "rainy"}), CTX) is not None
    # unavailable also fails entity_state_not (fail-safe, never "in doubt drive")
    assert evaluate_condition(cond, states({}), CTX) is not None


# --------------------------------------------------------------- cover_position


def test_cover_position_ops():
    above = Condition(type="cover_position", op="above", value=5)
    below = Condition(type="cover_position", op="below", value=90)
    between = Condition(type="cover_position", op="between", value=40, value2=60)
    get = states({})
    assert evaluate_condition(above, get, CTX) is None  # 50 > 5
    assert evaluate_condition(below, get, CTX) is None  # 50 < 90
    assert evaluate_condition(between, get, CTX) is None  # 40 <= 50 <= 60
    ctx_low = CoverContext(position=3)
    assert evaluate_condition(above, get, ctx_low) is not None


def test_cover_position_unknown_fails():
    cond = Condition(type="cover_position", op="above", value=5)
    assert evaluate_condition(cond, states({}), CoverContext()) is not None


def test_cover_position_between_swapped_bounds():
    cond = Condition(type="cover_position", op="between", value=60, value2=40)
    assert evaluate_condition(cond, states({}), CTX) is None


# --------------------------------------------------------------------- contact


def test_contact_condition():
    cond = Condition(type="contact", accepted=["closed", "tilted"])
    assert evaluate_condition(cond, states({}), CTX) is None
    ctx_open = CoverContext(contact="open", contact_entity_id="sensor.contact")
    assert evaluate_condition(cond, states({}), ctx_open) is not None
    ctx_unknown = CoverContext(contact="unknown", contact_entity_id="sensor.contact")
    assert evaluate_condition(cond, states({}), ctx_unknown) is not None


def test_contact_without_sensor_fails():
    cond = Condition(type="contact", accepted=["closed"])
    assert evaluate_condition(cond, states({}), CoverContext()) is not None


# ---------------------------------------------------------------- numeric_state


def test_numeric_state():
    cond = Condition(type="numeric_state", entity_id="s.lux", above=100)
    assert evaluate_condition(cond, states({"s.lux": "150"}), CTX) is None
    assert evaluate_condition(cond, states({"s.lux": "50"}), CTX) is not None
    assert evaluate_condition(cond, states({"s.lux": "abc"}), CTX) is not None
    both = Condition(type="numeric_state", entity_id="s.t", above=10, below=25)
    assert evaluate_condition(both, states({"s.t": "20"}), CTX) is None
    assert evaluate_condition(both, states({"s.t": "30"}), CTX) is not None


def test_numeric_state_without_threshold_is_invalid():
    cond = Condition(type="numeric_state", entity_id="s.lux")
    assert evaluate_condition(cond, states({"s.lux": "5"}), CTX) is not None


# ----------------------------------------------------------- evaluate_conditions


def test_and_semantics_and_rearm_set():
    conds = [
        Condition(type="entity_state", entity_id="s.w", states=["sunny"]),
        Condition(type="numeric_state", entity_id="s.lux", above=100),
        Condition(type="cover_position", op="above", value=5),
    ]
    result = evaluate_conditions(conds, states({"s.w": "cloudy", "s.lux": "50"}), CTX)
    assert not result.passed
    assert len(result.failed_reasons) == 2
    # cover_position passed; both failed external entities are listened to
    assert result.rearm_entity_ids == {"s.w", "s.lux"}


def test_cover_position_never_rearms():
    conds = [Condition(type="cover_position", op="above", value=90)]
    result = evaluate_conditions(conds, states({}), CTX)
    assert not result.passed
    assert result.rearm_entity_ids == set()


def test_contact_rearms_via_contact_entity():
    conds = [Condition(type="contact", accepted=["closed"])]
    ctx_open = CoverContext(contact="open", contact_entity_id="sensor.contact")
    result = evaluate_conditions(conds, states({}), ctx_open)
    assert result.rearm_entity_ids == {"sensor.contact"}


def test_same_entity_state_conditions_are_or_merged():
    conds = [
        Condition(type="entity_state", entity_id="s.w", states=["sunny"]),
        Condition(type="entity_state", entity_id="s.w", states=["partly_sunny"]),
    ]
    result = evaluate_conditions(conds, states({"s.w": "partly_sunny"}), CTX)
    assert result.passed


def test_empty_conditions_pass():
    assert evaluate_conditions([], states({}), CTX).passed
