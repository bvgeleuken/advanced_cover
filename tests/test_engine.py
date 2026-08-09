"""Tests for the pure condition engine."""

from __future__ import annotations

from custom_components.advanced_cover.engine import (
    CoverContext,
    evaluate_condition,
    evaluate_conditions,
    evaluate_conditions_detailed,
    rollup_preflight,
    safety_would_block,
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


# ------------------------------------------------------------------- preflight


def test_preflight_would_run_when_all_pass():
    conds = [Condition(type="entity_state", entity_id="s.w", states=["on"])]
    evals = evaluate_conditions_detailed(conds, states({"s.w": "on"}), CTX, "scenario")
    pf = rollup_preflight(evals, "NOW")
    assert pf["verdict"] == "would_run"
    assert pf["failing"] == 0
    assert evals[0].ok is True


def test_preflight_would_skip_reports_reason():
    conds = [Condition(type="entity_state", entity_id="s.w", states=["on"])]
    evals = evaluate_conditions_detailed(conds, states({"s.w": "off"}), CTX, "scenario")
    pf = rollup_preflight(evals, "NOW")
    assert pf["verdict"] == "would_skip"
    assert pf["failing"] == 1
    assert evals[0].ok is False
    assert evals[0].actual == "off"
    assert evals[0].summary_key == "config_panel.cond_sum_entity_state"
    assert evals[0].summary_values["expected"] == "on"


def test_preflight_unknown_on_unavailable():
    conds = [Condition(type="entity_state", entity_id="s.w", states=["on"])]
    evals = evaluate_conditions_detailed(
        conds, states({"s.w": "unavailable"}), CTX, "scenario"
    )
    pf = rollup_preflight(evals, "NOW")
    assert pf["verdict"] == "unknown"
    assert evals[0].ok is None
    assert evals[0].summary_key == "config_panel.cond_sum_unavailable"


def test_preflight_empty_is_would_run():
    assert rollup_preflight([], "NOW")["verdict"] == "would_run"


def test_preflight_false_beats_null():
    conds = [
        Condition(type="entity_state", entity_id="s.a", states=["on"]),
        Condition(type="entity_state", entity_id="s.b", states=["on"]),
    ]
    evals = evaluate_conditions_detailed(
        conds, states({"s.a": "off", "s.b": "unavailable"}), CTX, "scenario"
    )
    # one false + one null → would_skip wins
    assert rollup_preflight(evals, "NOW")["verdict"] == "would_skip"


def test_safety_would_block_matches_executor_semantics():
    # open window, closing move below ventilation → blocked
    assert safety_would_block(
        contact="open",
        block_when_tilted=False,
        ventilation_position=20,
        target_position=0,
        current_position=100,
    )
    # opening move (target >= current) is never blocked
    assert not safety_would_block(
        contact="open",
        block_when_tilted=False,
        ventilation_position=20,
        target_position=100,
        current_position=0,
    )
    # target at/above ventilation is fine
    assert not safety_would_block(
        contact="open",
        block_when_tilted=False,
        ventilation_position=20,
        target_position=20,
        current_position=100,
    )
    # tilted only blocks when configured
    assert not safety_would_block(
        contact="tilted",
        block_when_tilted=False,
        ventilation_position=20,
        target_position=0,
        current_position=100,
    )
    assert safety_would_block(
        contact="tilted",
        block_when_tilted=True,
        ventilation_position=20,
        target_position=0,
        current_position=100,
    )


def test_preflight_verdict_matches_trigger_path():
    # The preflight ok flags and the trigger-path pass must agree.
    conds = [
        Condition(type="entity_state", entity_id="s.w", states=["sunny"]),
        Condition(type="numeric_state", entity_id="s.lux", above=100),
    ]
    get = states({"s.w": "sunny", "s.lux": "150"})
    evals = evaluate_conditions_detailed(conds, get, CTX, "scenario")
    trigger = evaluate_conditions(conds, get, CTX)
    assert (rollup_preflight(evals, "NOW")["verdict"] == "would_run") == trigger.passed


# ---------------------------------------------------------------- sun_position


def _sun_cond(**kwargs):
    from custom_components.advanced_cover.models import Condition

    return Condition(type="sun_position", **kwargs)


def test_sun_elevation_above_and_below():
    from custom_components.advanced_cover.engine import SunContext

    get = states({})
    sun = SunContext(azimuth=200.0, elevation=25.0)
    assert evaluate_condition(_sun_cond(above=15), get, CTX, sun) is None
    assert evaluate_condition(_sun_cond(above=30), get, CTX, sun) is not None
    assert evaluate_condition(_sun_cond(below=30), get, CTX, sun) is None
    assert evaluate_condition(_sun_cond(below=20), get, CTX, sun) is not None


def test_sun_azimuth_absolute_window_wraps_north():
    from custom_components.advanced_cover.engine import SunContext

    get = states({})
    cond = _sun_cond(az_mode="absolute", az_from=300, az_to=60)
    on = SunContext(azimuth=5, elevation=10)
    assert evaluate_condition(cond, get, CTX, on) is None
    assert (
        evaluate_condition(cond, get, CTX, SunContext(azimuth=180, elevation=10))
        is not None
    )


def test_sun_azimuth_relative_uses_cover_facade():
    from custom_components.advanced_cover.engine import CoverContext, SunContext

    get = states({})
    south = CoverContext(azimuth=180)
    # Window from -45° to +60° around a south facade: 135°..240°.
    cond = _sun_cond(az_mode="relative", az_from=-45, az_to=60)
    sun_on = SunContext(azimuth=200, elevation=30)
    sun_off = SunContext(azimuth=120, elevation=30)
    assert evaluate_condition(cond, get, south, sun_on) is None
    assert evaluate_condition(cond, get, south, sun_off) is not None
    # Same condition on a cover without a facade azimuth fails safely.
    reason = evaluate_condition(cond, get, CoverContext(), sun_on)
    assert reason is not None and "facade" in reason


def test_sun_relative_window_is_hemisphere_neutral():
    """A pure angular window: the same relative condition matches a sun at
    200° on a south facade and a sun at 20° on a north facade (Sydney)."""
    from custom_components.advanced_cover.engine import CoverContext, SunContext

    get = states({})
    cond = _sun_cond(az_mode="relative", az_from=-45, az_to=60)
    assert (
        evaluate_condition(
            cond, get, CoverContext(azimuth=180), SunContext(azimuth=200, elevation=30)
        )
        is None
    )
    assert (
        evaluate_condition(
            cond, get, CoverContext(azimuth=0), SunContext(azimuth=20, elevation=30)
        )
        is None
    )


def test_sun_unavailable_fails_safe_and_rearms_on_sun_entity():
    from custom_components.advanced_cover.engine import SunContext

    get = states({})
    cond = _sun_cond(above=10)
    assert evaluate_condition(cond, get, CTX, None) is not None
    assert evaluate_condition(cond, get, CTX, SunContext()) is not None
    result = evaluate_conditions([cond], get, CTX, SunContext())
    assert not result.passed
    assert result.rearm_entity_ids == {"sun.sun"}


def test_sun_condition_without_constraints_is_invalid():
    from custom_components.advanced_cover.engine import SunContext

    reason = evaluate_condition(
        _sun_cond(), states({}), CTX, SunContext(azimuth=100, elevation=10)
    )
    assert reason is not None and "invalid" in reason


def test_sun_preflight_unknown_when_sun_missing():
    evals = evaluate_conditions_detailed(
        [_sun_cond(above=10)], states({}), CTX, "scenario"
    )
    assert evals[0].ok is None  # unavailable, not a hard fail


def test_sun_preflight_combined_elevation_and_azimuth():
    from custom_components.advanced_cover.engine import CoverContext, SunContext

    cond = _sun_cond(above=15, az_mode="relative", az_from=-45, az_to=60)
    evals = evaluate_conditions_detailed(
        [cond],
        states({}),
        CoverContext(azimuth=180),
        "assignment",
        SunContext(azimuth=200, elevation=30),
    )
    assert evals[0].ok is True
    assert evals[0].summary_values["az_req"] == "135°-240°"
    assert evals[0].summary_values["elev_req"] == "> 15°"


# ------------------------------------------------------- cover-scoped scoping


def test_cover_scoped_classification():
    from custom_components.advanced_cover.engine import is_cover_scoped

    assert is_cover_scoped(Condition(type="cover_position", value=5))
    assert is_cover_scoped(Condition(type="contact", accepted=["closed"]))
    assert is_cover_scoped(
        _sun_cond(above=10, az_mode="relative", az_from=-45, az_to=45)
    )
    assert not is_cover_scoped(_sun_cond(above=10))
    assert not is_cover_scoped(
        Condition(type="entity_state", entity_id="s.a", states=["on"])
    )
    assert not is_cover_scoped(
        Condition(type="numeric_state", entity_id="s.a", above=1)
    )


def test_split_cover_scoped_keeps_order():
    from custom_components.advanced_cover.engine import split_cover_scoped

    a = Condition(type="entity_state", entity_id="s.a", states=["on"])
    b = Condition(type="cover_position", op="above", value=5)
    c = Condition(type="numeric_state", entity_id="s.b", above=1)
    wide, scoped = split_cover_scoped([a, b, c])
    assert wide == [a, c]
    assert scoped == [b]


def test_cover_position_without_cover_names_the_position():
    # Scenario scope used to evaluate this against an empty cover context and
    # rendered a bare "?" — the summary must name what is missing.
    evals = evaluate_conditions_detailed(
        [Condition(type="cover_position", op="above", value=5)],
        states({}),
        CoverContext(),
        "scenario",
    )
    assert evals[0].ok is None
    assert evals[0].summary_key == "config_panel.cond_sum_position_unknown"


def test_cover_position_with_cover_context_is_decided():
    conds = [Condition(type="cover_position", op="above", value=5)]
    evals = evaluate_conditions_detailed(
        conds, states({}), CoverContext(position=100), "scenario"
    )
    assert evals[0].ok is True
    assert rollup_preflight(evals, "NOW")["verdict"] == "would_run"

    evals = evaluate_conditions_detailed(
        conds, states({}), CoverContext(position=0), "scenario"
    )
    assert evals[0].ok is False
    assert rollup_preflight(evals, "NOW")["verdict"] == "would_skip"


def test_contact_summaries_name_the_sensor():
    cond = Condition(type="contact", accepted=["closed"])
    evals = evaluate_conditions_detailed([cond], states({}), CoverContext(), "scenario")
    assert evals[0].ok is None
    assert evals[0].summary_key == "config_panel.cond_sum_no_contact"

    evals = evaluate_conditions_detailed(
        [cond],
        states({}),
        CoverContext(contact="unknown", contact_entity_id="binary_sensor.w"),
        "assignment",
    )
    assert evals[0].ok is None
    assert evals[0].summary_key == "config_panel.cond_sum_unavailable"
    assert evals[0].summary_values["entity"] == "binary_sensor.w"


def test_relative_sun_without_facade_is_unknown_not_failed():
    from custom_components.advanced_cover.engine import SunContext

    evals = evaluate_conditions_detailed(
        [_sun_cond(above=5, az_mode="relative", az_from=-45, az_to=45)],
        states({}),
        CoverContext(position=50),
        "scenario",
        SunContext(azimuth=200, elevation=30),
    )
    assert evals[0].ok is None
    assert evals[0].summary_key == "config_panel.cond_sum_no_facade"
