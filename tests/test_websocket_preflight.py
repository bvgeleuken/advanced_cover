"""Preflight assembly for the panel (block vs. per-cover conditions).

A scenario-level ``cover_position``/``contact``/relative-sun condition is
AND-ed onto every assigned cover at trigger time, so the panel has to
evaluate it once per cover too — evaluating it once for the whole block
(where no cover is in scope) can only ever say "cannot be evaluated".
"""

from __future__ import annotations

from typing import Any

from custom_components.advanced_cover.models import (
    Assignment,
    Condition,
    CoverItem,
    EntryData,
    Scenario,
    Trigger,
)
from custom_components.advanced_cover.websocket import _enrich_occurrence
from homeassistant.core import HomeAssistant


def _data(*conditions: Condition, extra: list[Condition] | None = None) -> EntryData:
    cover = CoverItem(id="c1", name="Bath", cover_entity_id="cover.bath")
    scenario = Scenario(
        id="s1",
        name="Open east windows",
        trigger=Trigger(type="fixed_time", time_local="12:00"),
        conditions=list(conditions),
        assignments=[Assignment(cover_item_id="c1", extra_conditions=extra or [])],
    )
    return EntryData(covers={"c1": cover}, scenarios=[scenario])


def _occ_dict() -> dict[str, Any]:
    return {
        "scenario_id": "s1",
        "scenario_name": "Open east windows",
        "planned_at": "2026-08-09T12:00:00+00:00",
        "fired": False,
        "assignments": [
            {
                "cover_item_id": "c1",
                "cover_name": "Bath",
                "target_position": 100,
                "preflight": None,
            }
        ],
    }


def _run(occ: dict[str, Any]) -> dict[str, Any]:
    return occ["assignments"][0]


async def test_scenario_cover_position_is_evaluated_per_cover(
    hass: HomeAssistant,
) -> None:
    hass.states.async_set("cover.bath", "open", {"current_position": 100})
    data = _data(Condition(type="cover_position", op="above", value=5))

    occ = _enrich_occurrence(hass, data, _occ_dict(), "NOW")

    # The block itself has nothing left to check…
    assert occ["preflight"]["verdict"] == "would_run"
    assert occ["preflight"]["conditions"] == []
    # …the condition is decided against the cover, not reported as unknown.
    run_pf = _run(occ)["preflight"]
    assert run_pf["verdict"] == "would_run"
    assert [c["scope"] for c in run_pf["conditions"]] == ["scenario"]
    assert run_pf["conditions"][0]["ok"] is True
    assert occ["covers_would_run"] == 1


async def test_scenario_cover_position_can_skip(hass: HomeAssistant) -> None:
    hass.states.async_set("cover.bath", "closed", {"current_position": 0})
    data = _data(Condition(type="cover_position", op="above", value=5))

    occ = _enrich_occurrence(hass, data, _occ_dict(), "NOW")

    run_pf = _run(occ)["preflight"]
    assert run_pf["verdict"] == "would_skip"
    assert run_pf["conditions"][0]["actual"] == "0"
    assert occ["covers_would_run"] == 0


async def test_unknown_only_when_the_position_really_is_unknown(
    hass: HomeAssistant,
) -> None:
    hass.states.async_set("cover.bath", "unavailable")
    data = _data(Condition(type="cover_position", op="above", value=5))

    run_pf = _run(_enrich_occurrence(hass, data, _occ_dict(), "NOW"))["preflight"]

    assert run_pf["verdict"] == "unknown"
    assert (
        run_pf["conditions"][0]["summary_key"]
        == "config_panel.cond_sum_position_unknown"
    )


async def test_scenario_wide_conditions_stay_on_the_block(hass: HomeAssistant) -> None:
    hass.states.async_set("cover.bath", "open", {"current_position": 100})
    hass.states.async_set("binary_sensor.nobody_home", "off")
    data = _data(
        Condition(
            type="entity_state", entity_id="binary_sensor.nobody_home", states=["on"]
        ),
        Condition(type="cover_position", op="above", value=5),
        extra=[Condition(type="cover_position", op="below", value=90)],
    )

    occ = _enrich_occurrence(hass, data, _occ_dict(), "NOW")

    block = occ["preflight"]
    assert block["verdict"] == "would_skip"
    assert [c["type"] for c in block["conditions"]] == ["entity_state"]
    # Scenario-scoped first, then the assignment's own extra conditions.
    run_pf = _run(occ)["preflight"]
    assert [c["scope"] for c in run_pf["conditions"]] == ["scenario", "assignment"]
    assert [c["ok"] for c in run_pf["conditions"]] == [True, False]
    assert occ["covers_would_run"] == 0
