"""WebSocket API for the custom panel (admin only)."""

from __future__ import annotations

import logging
from typing import Any

import voluptuous as vol
from homeassistant.components import websocket_api
from homeassistant.components.cover import (
    ATTR_POSITION,
    SERVICE_CLOSE_COVER,
    SERVICE_OPEN_COVER,
    SERVICE_SET_COVER_POSITION,
    SERVICE_STOP_COVER,
)
from homeassistant.components.cover import (
    DOMAIN as COVER_DOMAIN,
)
from homeassistant.const import ATTR_ENTITY_ID
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers.sun import get_astral_event_date
from homeassistant.util import dt as dt_util

from .capabilities import (
    default_contact_map,
    default_kind_for_state,
    get_cover_capabilities,
    resolve_contact_state,
)
from .const import DOMAIN
from .coordinator import AdvancedCoverCoordinator
from .executor import current_cover_position
from .models import CoverItem, EntryConfig, EntryData, Scenario, new_id
from .scheduler import AdvancedCoverScheduler

_LOGGER = logging.getLogger(__name__)

ERR_NOT_FOUND = "not_found"


def _domain_entries(hass: HomeAssistant) -> dict[str, dict[str, Any]]:
    """All loaded entry runtime dicts."""
    return {
        k: v
        for k, v in hass.data.get(DOMAIN, {}).items()
        if isinstance(v, dict) and "coordinator" in v
    }


def _get_runtime(
    hass: HomeAssistant, entry_id: str | None
) -> tuple[AdvancedCoverCoordinator, AdvancedCoverScheduler] | None:
    """Resolve coordinator + scheduler for an entry id (or the only entry)."""
    entries = _domain_entries(hass)
    data: dict[str, Any] | None = None
    if entry_id:
        data = entries.get(entry_id)
    elif len(entries) == 1:
        data = next(iter(entries.values()))
    if data is None:
        return None
    return data["coordinator"], data["scheduler"]


def _entity_missing(hass: HomeAssistant, entity_id: str | None) -> bool:
    """Return True when a referenced entity id has no state object."""
    return bool(entity_id) and hass.states.get(entity_id) is None


def _cover_runtime_info(
    hass: HomeAssistant,
    scheduler: AdvancedCoverScheduler,
    cover: CoverItem,
) -> dict[str, Any]:
    """Live info for one cover: capabilities, position, contact, warnings."""
    caps = get_cover_capabilities(hass, cover.cover_entity_id)
    state = hass.states.get(cover.cover_entity_id)
    contact_raw = (
        hass.states.get(cover.contact_entity_id) if cover.contact_entity_id else None
    )
    warnings = [
        entity_id
        for entity_id in (
            cover.cover_entity_id,
            cover.low_mode_entity_id,
            cover.low_mode_script_id,
            cover.contact_entity_id,
        )
        if entity_id and _entity_missing(hass, entity_id)
    ]
    return {
        **cover.to_dict(),
        "capabilities": caps.to_dict(),
        "current_position": current_cover_position(state),
        "contact_state": (
            resolve_contact_state(
                contact_raw.state if contact_raw else None, cover.contact_state_map
            )
            if cover.contact_entity_id
            else None
        ),
        "next_action": scheduler.next_action_for_cover(cover.id),
        "missing_entities": warnings,
    }


def _scenario_warnings(
    hass: HomeAssistant, data: EntryData, scenario: Scenario
) -> list[str]:
    """Return validation warnings for a scenario (plan §6 UX guard rails)."""
    warnings: list[str] = []
    for cond in [
        *scenario.conditions,
        *(c for a in scenario.assignments for c in a.extra_conditions),
    ]:
        if cond.entity_id and _entity_missing(hass, cond.entity_id):
            warnings.append(f"Entity {cond.entity_id} not found")
    for assignment in scenario.assignments:
        cover = data.covers.get(assignment.cover_item_id)
        if cover is None:
            warnings.append(f"Assigned cover {assignment.cover_item_id} was removed")
            continue
        action = assignment.resolved_action(scenario.action)
        caps = get_cover_capabilities(hass, cover.cover_entity_id)
        if (
            caps.available
            and not caps.supports_position
            and action.position not in (0, 100)
        ):
            warnings.append(
                f"{cover.name} only supports open/close; "
                f"{action.position}% will map to "
                f"{'open' if action.position >= 50 else 'closed'}"
            )
        if (
            action.tilt_position is not None
            and caps.available
            and not caps.supports_tilt
        ):
            warnings.append(f"{cover.name} does not support tilt")
    return warnings


def _snapshot(
    hass: HomeAssistant,
    coordinator: AdvancedCoverCoordinator,
    scheduler: AdvancedCoverScheduler,
) -> dict[str, Any]:
    """Full panel state for one entry."""
    data = coordinator.data_model
    today = dt_util.now().date()
    sun: dict[str, str | None] = {}
    for event, astral in (("sunrise", "sunrise"), ("sunset", "sunset")):
        when = get_astral_event_date(hass, astral, today)
        sun[event] = dt_util.as_local(when).isoformat() if when else None
    return {
        "entry_id": coordinator.config_entry.entry_id,
        "config": data.config.to_dict(),
        "covers": [
            _cover_runtime_info(hass, scheduler, c) for c in data.covers.values()
        ],
        "scenarios": [
            {**s.to_dict(), "warnings": _scenario_warnings(hass, data, s)}
            for s in data.scenarios
        ],
        "plan": [occ.to_dict() for occ in coordinator.day_plan],
        "log": list(coordinator.action_log),
        "sun": sun,
        "now": dt_util.now().isoformat(),
    }


@callback
def async_register_websocket_api(hass: HomeAssistant) -> None:
    """Register all WebSocket commands."""
    websocket_api.async_register_command(hass, ws_entries_list)
    websocket_api.async_register_command(hass, ws_state)
    websocket_api.async_register_command(hass, ws_subscribe)
    websocket_api.async_register_command(hass, ws_config_save)
    websocket_api.async_register_command(hass, ws_cover_save)
    websocket_api.async_register_command(hass, ws_cover_delete)
    websocket_api.async_register_command(hass, ws_cover_probe)
    websocket_api.async_register_command(hass, ws_cover_test)
    websocket_api.async_register_command(hass, ws_scenario_save)
    websocket_api.async_register_command(hass, ws_scenario_delete)
    websocket_api.async_register_command(hass, ws_scenario_reorder)
    websocket_api.async_register_command(hass, ws_scenario_run)
    websocket_api.async_register_command(hass, ws_recalculate)


@websocket_api.websocket_command({vol.Required("type"): f"{DOMAIN}/entries/list"})
@websocket_api.require_admin
@callback
def ws_entries_list(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """List loaded config entries for the entry picker."""
    result = []
    for entry_id, data in _domain_entries(hass).items():
        coordinator: AdvancedCoverCoordinator = data["coordinator"]
        result.append(
            {"entry_id": entry_id, "name": coordinator.data_model.config.name}
        )
    connection.send_result(msg["id"], result)


def _resolve_or_error(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> tuple[AdvancedCoverCoordinator, AdvancedCoverScheduler] | None:
    """Resolve runtime or send a not-found error."""
    runtime = _get_runtime(hass, msg.get("entry_id"))
    if runtime is None:
        connection.send_error(msg["id"], ERR_NOT_FOUND, "Config entry not loaded")
    return runtime


@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/state",
        vol.Optional("entry_id"): str,
    }
)
@websocket_api.require_admin
@callback
def ws_state(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Return the full panel state."""
    if (runtime := _resolve_or_error(hass, connection, msg)) is None:
        return
    connection.send_result(msg["id"], _snapshot(hass, *runtime))


@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/subscribe",
        vol.Optional("entry_id"): str,
    }
)
@websocket_api.require_admin
@callback
def ws_subscribe(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Push the panel state on every coordinator update."""
    if (runtime := _resolve_or_error(hass, connection, msg)) is None:
        return
    coordinator, scheduler = runtime

    @callback
    def _push() -> None:
        connection.send_message(
            websocket_api.event_message(
                msg["id"], _snapshot(hass, coordinator, scheduler)
            )
        )

    connection.subscriptions[msg["id"]] = coordinator.async_add_listener(_push)
    connection.send_result(msg["id"])
    _push()


@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/config/save",
        vol.Optional("entry_id"): str,
        vol.Required("config"): dict,
    }
)
@websocket_api.require_admin
@websocket_api.async_response
async def ws_config_save(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Save global entry settings."""
    if (runtime := _resolve_or_error(hass, connection, msg)) is None:
        return
    coordinator, _ = runtime
    current = coordinator.data_model.config.to_dict()
    current.update(msg["config"])
    coordinator.data_model.config = EntryConfig.from_dict(current)
    executor = hass.data[DOMAIN][coordinator.config_entry.entry_id]["executor"]
    executor.set_default_delta(coordinator.data_model.config.default_min_position_delta)
    await coordinator.async_save_and_notify()
    connection.send_result(msg["id"], {"success": True})


@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/covers/save",
        vol.Optional("entry_id"): str,
        vol.Required("cover"): dict,
    }
)
@websocket_api.require_admin
@websocket_api.async_response
async def ws_cover_save(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Create or update a cover item."""
    if (runtime := _resolve_or_error(hass, connection, msg)) is None:
        return
    coordinator, _ = runtime
    payload = dict(msg["cover"])
    if not str(payload.get("cover_entity_id") or "").strip():
        connection.send_error(msg["id"], "invalid_format", "cover_entity_id required")
        return
    if not payload.get("id"):
        payload["id"] = new_id()
    cover = CoverItem.from_dict(payload)
    coordinator.data_model.covers[cover.id] = cover
    await coordinator.async_save_and_notify()
    connection.send_result(msg["id"], {"success": True, "id": cover.id})


@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/covers/delete",
        vol.Optional("entry_id"): str,
        vol.Required("cover_item_id"): str,
    }
)
@websocket_api.require_admin
@websocket_api.async_response
async def ws_cover_delete(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Delete a cover item, its assignments and its HA entities."""
    if (runtime := _resolve_or_error(hass, connection, msg)) is None:
        return
    coordinator, _ = runtime
    cover_id = msg["cover_item_id"]
    data = coordinator.data_model
    if cover_id not in data.covers:
        connection.send_error(msg["id"], ERR_NOT_FOUND, "Unknown cover item")
        return
    data.covers.pop(cover_id)
    for scenario in data.scenarios:
        scenario.assignments = [
            a for a in scenario.assignments if a.cover_item_id != cover_id
        ]

    registry = er.async_get(hass)
    entry_id = coordinator.config_entry.entry_id
    for platform, suffix in (
        ("switch", f"cover_{cover_id}_automation"),
        ("sensor", f"cover_{cover_id}_next_action"),
        ("binary_sensor", f"cover_{cover_id}_safety_blocked"),
    ):
        entity_id = registry.async_get_entity_id(
            platform, DOMAIN, f"{entry_id}_{suffix}"
        )
        if entity_id:
            registry.async_remove(entity_id)

    await coordinator.async_save_and_notify()
    connection.send_result(msg["id"], {"success": True})


@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/covers/probe",
        vol.Required("entity_id"): str,
        vol.Optional("contact_entity_id"): str,
    }
)
@websocket_api.require_admin
@callback
def ws_cover_probe(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Probe a cover entity: capabilities, suggested kind, contact mapping."""
    state = hass.states.get(msg["entity_id"])
    result: dict[str, Any] = {
        "capabilities": get_cover_capabilities(hass, msg["entity_id"]).to_dict(),
        "suggested_kind": default_kind_for_state(state),
    }
    if contact_id := msg.get("contact_entity_id"):
        contact_state = hass.states.get(contact_id)
        result["suggested_contact_map"] = default_contact_map(contact_state)
        result["contact_current_state"] = contact_state.state if contact_state else None
    connection.send_result(msg["id"], result)


@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/covers/test",
        vol.Optional("entry_id"): str,
        vol.Required("cover_item_id"): str,
        vol.Required("command"): vol.In(["open", "close", "stop", "position"]),
        vol.Optional("position"): vol.All(int, vol.Range(min=0, max=100)),
    }
)
@websocket_api.require_admin
@websocket_api.async_response
async def ws_cover_test(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Directly drive a cover from the panel's test buttons."""
    if (runtime := _resolve_or_error(hass, connection, msg)) is None:
        return
    coordinator, _ = runtime
    cover = coordinator.cover_by_id(msg["cover_item_id"])
    if cover is None:
        connection.send_error(msg["id"], ERR_NOT_FOUND, "Unknown cover item")
        return
    service_map = {
        "open": SERVICE_OPEN_COVER,
        "close": SERVICE_CLOSE_COVER,
        "stop": SERVICE_STOP_COVER,
    }
    if msg["command"] == "position":
        await hass.services.async_call(
            COVER_DOMAIN,
            SERVICE_SET_COVER_POSITION,
            {
                ATTR_ENTITY_ID: cover.cover_entity_id,
                ATTR_POSITION: msg.get("position", 50),
            },
            blocking=True,
        )
    else:
        await hass.services.async_call(
            COVER_DOMAIN,
            service_map[msg["command"]],
            {ATTR_ENTITY_ID: cover.cover_entity_id},
            blocking=True,
        )
    connection.send_result(msg["id"], {"success": True})


@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/scenarios/save",
        vol.Optional("entry_id"): str,
        vol.Required("scenario"): dict,
    }
)
@websocket_api.require_admin
@websocket_api.async_response
async def ws_scenario_save(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Create or update a scenario; returns validation warnings."""
    if (runtime := _resolve_or_error(hass, connection, msg)) is None:
        return
    coordinator, _ = runtime
    payload = dict(msg["scenario"])
    if not payload.get("id"):
        payload["id"] = new_id()
    scenario = Scenario.from_dict(payload)
    data = coordinator.data_model
    existing = data.scenario_by_id(scenario.id)
    if existing is None:
        data.scenarios.append(scenario)
    else:
        data.scenarios[data.scenarios.index(existing)] = scenario
    await coordinator.async_save_and_notify()
    connection.send_result(
        msg["id"],
        {
            "success": True,
            "id": scenario.id,
            "warnings": _scenario_warnings(hass, data, scenario),
        },
    )


@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/scenarios/delete",
        vol.Optional("entry_id"): str,
        vol.Required("scenario_id"): str,
    }
)
@websocket_api.require_admin
@websocket_api.async_response
async def ws_scenario_delete(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Delete a scenario."""
    if (runtime := _resolve_or_error(hass, connection, msg)) is None:
        return
    coordinator, _ = runtime
    data = coordinator.data_model
    scenario = data.scenario_by_id(msg["scenario_id"])
    if scenario is None:
        connection.send_error(msg["id"], ERR_NOT_FOUND, "Unknown scenario")
        return
    data.scenarios.remove(scenario)
    await coordinator.async_save_and_notify()
    connection.send_result(msg["id"], {"success": True})


@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/scenarios/reorder",
        vol.Optional("entry_id"): str,
        vol.Required("scenario_ids"): [str],
    }
)
@websocket_api.require_admin
@websocket_api.async_response
async def ws_scenario_reorder(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Reorder scenarios (drag order = collision priority)."""
    if (runtime := _resolve_or_error(hass, connection, msg)) is None:
        return
    coordinator, _ = runtime
    data = coordinator.data_model
    by_id = {s.id: s for s in data.scenarios}
    reordered = [by_id.pop(sid) for sid in msg["scenario_ids"] if sid in by_id]
    reordered.extend(by_id.values())  # keep any ids missing from the request
    data.scenarios = reordered
    await coordinator.async_save_and_notify()
    connection.send_result(msg["id"], {"success": True})


@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/scenarios/run",
        vol.Optional("entry_id"): str,
        vol.Required("scenario_id"): str,
        vol.Optional("cover_item_id"): str,
        vol.Optional("ignore_conditions", default=False): bool,
    }
)
@websocket_api.require_admin
@websocket_api.async_response
async def ws_scenario_run(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Run a scenario now (panel test button)."""
    if (runtime := _resolve_or_error(hass, connection, msg)) is None:
        return
    _, scheduler = runtime
    try:
        await scheduler.async_run_scenario(
            msg["scenario_id"],
            cover_item_id=msg.get("cover_item_id"),
            ignore_conditions=msg["ignore_conditions"],
        )
    except ValueError as err:
        connection.send_error(msg["id"], ERR_NOT_FOUND, str(err))
        return
    connection.send_result(msg["id"], {"success": True})


@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/recalculate",
        vol.Optional("entry_id"): str,
    }
)
@websocket_api.require_admin
@websocket_api.async_response
async def ws_recalculate(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Rebuild today's plan."""
    if (runtime := _resolve_or_error(hass, connection, msg)) is None:
        return
    _, scheduler = runtime
    await scheduler.async_rebuild_plan()
    connection.send_result(msg["id"], {"success": True})
