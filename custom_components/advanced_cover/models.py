"""Typed domain models for Advanced Cover.

All models are plain dataclasses with ``to_dict``/``from_dict`` for the
versioned JSON store and the WebSocket API. Deserialization is defensive:
unknown enum values fall back to safe defaults, numeric values are clamped.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from typing import Any

from .const import (
    ACTION_MODES,
    COND_CONTACT,
    COND_COVER_POSITION,
    COND_ENTITY_STATE,
    COND_ENTITY_STATE_NOT,
    COND_NUMERIC_STATE,
    CONDITION_TYPES,
    CONTACT_STATES,
    DEFAULT_MIN_POSITION_DELTA,
    DEFAULT_RETRY_WINDOW_MIN,
    DEFAULT_VENTILATION_POSITION,
    KIND_OTHER,
    KINDS,
    MAX_RANDOM_WINDOW_MIN,
    MAX_RETRY_WINDOW_MIN,
    MODE_NORMAL,
    POSITION_OP_ABOVE,
    POSITION_OPS,
    RANDOM_DIRECTION_BOTH,
    RANDOM_DIRECTIONS,
    SAFETY_MODE_BLOCK,
    SAFETY_MODES,
    SUN_EVENT_SUNSET,
    SUN_EVENTS,
    TRIGGER_FIXED_TIME,
    TRIGGER_SUN_EVENT,
    TRIGGER_TYPES,
    WEEKDAYS,
)


def new_id() -> str:
    """Return a new stable object id."""
    return str(uuid.uuid4())


def _clamp(value: Any, low: int, high: int, default: int) -> int:
    """Parse ``value`` as int and clamp into [low, high]."""
    try:
        num = int(value)
    except (TypeError, ValueError):
        return default
    return max(low, min(high, num))


def _clamp_opt(value: Any, low: int, high: int) -> int | None:
    """Like :func:`_clamp` but ``None`` stays ``None``."""
    if value is None:
        return None
    try:
        num = int(value)
    except (TypeError, ValueError):
        return None
    return max(low, min(high, num))


def _opt_float(value: Any) -> float | None:
    """Parse an optional float."""
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _enum(value: Any, allowed: tuple[str, ...], default: str) -> str:
    """Return ``value`` if it is an allowed enum member, else ``default``."""
    return value if value in allowed else default


def _str_or_none(value: Any) -> str | None:
    """Return a stripped non-empty string or ``None``."""
    if value is None:
        return None
    text = str(value).strip()
    return text or None


@dataclass
class Condition:
    """One condition sentence (tagged union via ``type``).

    Field usage per type:
    - ``entity_state`` / ``entity_state_not``: ``entity_id`` + ``states``
      (multiple states in one condition are OR-ed).
    - ``cover_position``: ``op`` + ``value`` (+ ``value2`` for ``between``);
      refers to the assigned cover itself, never re-arms.
    - ``contact``: ``accepted`` (subset of closed/tilted/open); uses the
      cover's contact state map.
    - ``numeric_state``: ``entity_id`` + ``above`` and/or ``below``.
    """

    type: str
    entity_id: str | None = None
    states: list[str] = field(default_factory=list)
    op: str = POSITION_OP_ABOVE
    value: float | None = None
    value2: float | None = None
    accepted: list[str] = field(default_factory=list)
    above: float | None = None
    below: float | None = None

    def external_entity_ids(self) -> list[str]:
        """Entity ids whose changes may re-arm this condition.

        ``cover_position`` intentionally returns nothing: a manually moved
        cover must never trigger a re-evaluation (see plan §3).
        """
        if self.type in (COND_ENTITY_STATE, COND_ENTITY_STATE_NOT, COND_NUMERIC_STATE):
            return [self.entity_id] if self.entity_id else []
        return []

    def to_dict(self) -> dict[str, Any]:
        """Serialize to JSON-compatible dict (only fields the type uses)."""
        data: dict[str, Any] = {"type": self.type}
        if self.type in (COND_ENTITY_STATE, COND_ENTITY_STATE_NOT):
            data["entity_id"] = self.entity_id
            data["states"] = list(self.states)
        elif self.type == COND_COVER_POSITION:
            data["op"] = self.op
            data["value"] = self.value
            data["value2"] = self.value2
        elif self.type == COND_CONTACT:
            data["accepted"] = list(self.accepted)
        elif self.type == COND_NUMERIC_STATE:
            data["entity_id"] = self.entity_id
            data["above"] = self.above
            data["below"] = self.below
        return data

    @staticmethod
    def from_dict(data: dict[str, Any]) -> Condition:
        """Deserialize from store/WS dict."""
        ctype = _enum(data.get("type"), CONDITION_TYPES, COND_ENTITY_STATE)
        states_raw = data.get("states") or []
        states = [str(s) for s in states_raw if str(s).strip()]
        accepted = [s for s in (data.get("accepted") or []) if s in CONTACT_STATES]
        return Condition(
            type=ctype,
            entity_id=_str_or_none(data.get("entity_id")),
            states=states,
            op=_enum(data.get("op"), POSITION_OPS, POSITION_OP_ABOVE),
            value=_opt_float(data.get("value")),
            value2=_opt_float(data.get("value2")),
            accepted=accepted,
            above=_opt_float(data.get("above")),
            below=_opt_float(data.get("below")),
        )


@dataclass
class Trigger:
    """Scenario trigger: a fixed local time or a sun event with offset."""

    type: str = TRIGGER_FIXED_TIME
    time_local: str = "07:00"
    sun_event: str = SUN_EVENT_SUNSET
    offset_min: int = 0

    def to_dict(self) -> dict[str, Any]:
        """Serialize to JSON-compatible dict."""
        if self.type == TRIGGER_SUN_EVENT:
            return {
                "type": self.type,
                "sun_event": self.sun_event,
                "offset_min": self.offset_min,
            }
        return {"type": self.type, "time_local": self.time_local}

    @staticmethod
    def from_dict(data: dict[str, Any]) -> Trigger:
        """Deserialize from store/WS dict."""
        return Trigger(
            type=_enum(data.get("type"), TRIGGER_TYPES, TRIGGER_FIXED_TIME),
            time_local=str(data.get("time_local") or "07:00"),
            sun_event=_enum(data.get("sun_event"), SUN_EVENTS, SUN_EVENT_SUNSET),
            offset_min=_clamp(data.get("offset_min", 0), -720, 720, 0),
        )


@dataclass
class CoverAction:
    """Target action of a scenario (or a resolved assignment)."""

    position: int = 0
    tilt_position: int | None = None
    mode: str = MODE_NORMAL
    min_position_delta: int | None = None  # None → entry default

    def to_dict(self) -> dict[str, Any]:
        """Serialize to JSON-compatible dict."""
        return {
            "position": self.position,
            "tilt_position": self.tilt_position,
            "mode": self.mode,
            "min_position_delta": self.min_position_delta,
        }

    @staticmethod
    def from_dict(data: dict[str, Any]) -> CoverAction:
        """Deserialize from store/WS dict."""
        return CoverAction(
            position=_clamp(data.get("position", 0), 0, 100, 0),
            tilt_position=_clamp_opt(data.get("tilt_position"), 0, 100),
            mode=_enum(data.get("mode"), ACTION_MODES, MODE_NORMAL),
            min_position_delta=_clamp_opt(data.get("min_position_delta"), 0, 100),
        )


@dataclass
class ActionOverride:
    """Partial action override on an assignment; unset fields inherit."""

    position: int | None = None
    tilt_position: int | None = None
    mode: str | None = None
    min_position_delta: int | None = None

    def is_empty(self) -> bool:
        """Return True when nothing is overridden."""
        return (
            self.position is None
            and self.tilt_position is None
            and self.mode is None
            and self.min_position_delta is None
        )

    def to_dict(self) -> dict[str, Any]:
        """Serialize to JSON-compatible dict."""
        return {
            "position": self.position,
            "tilt_position": self.tilt_position,
            "mode": self.mode,
            "min_position_delta": self.min_position_delta,
        }

    @staticmethod
    def from_dict(data: dict[str, Any]) -> ActionOverride:
        """Deserialize from store/WS dict."""
        mode_raw = data.get("mode")
        return ActionOverride(
            position=_clamp_opt(data.get("position"), 0, 100),
            tilt_position=_clamp_opt(data.get("tilt_position"), 0, 100),
            mode=mode_raw if mode_raw in ACTION_MODES else None,
            min_position_delta=_clamp_opt(data.get("min_position_delta"), 0, 100),
        )


@dataclass
class Assignment:
    """A cover assigned to a scenario, with extra conditions and overrides."""

    cover_item_id: str
    extra_conditions: list[Condition] = field(default_factory=list)
    action_override: ActionOverride | None = None

    def resolved_action(self, default: CoverAction) -> CoverAction:
        """Merge the scenario default action with this assignment's override."""
        if self.action_override is None or self.action_override.is_empty():
            return default
        ov = self.action_override
        return CoverAction(
            position=ov.position if ov.position is not None else default.position,
            tilt_position=(
                ov.tilt_position
                if ov.tilt_position is not None
                else default.tilt_position
            ),
            mode=ov.mode if ov.mode is not None else default.mode,
            min_position_delta=(
                ov.min_position_delta
                if ov.min_position_delta is not None
                else default.min_position_delta
            ),
        )

    def to_dict(self) -> dict[str, Any]:
        """Serialize to JSON-compatible dict."""
        return {
            "cover_item_id": self.cover_item_id,
            "extra_conditions": [c.to_dict() for c in self.extra_conditions],
            "action_override": (
                self.action_override.to_dict() if self.action_override else None
            ),
        }

    @staticmethod
    def from_dict(data: dict[str, Any]) -> Assignment:
        """Deserialize from store/WS dict."""
        override_raw = data.get("action_override")
        override = ActionOverride.from_dict(override_raw) if override_raw else None
        if override is not None and override.is_empty():
            override = None
        return Assignment(
            cover_item_id=str(data["cover_item_id"]),
            extra_conditions=[
                Condition.from_dict(c) for c in (data.get("extra_conditions") or [])
            ],
            action_override=override,
        )


@dataclass
class Scenario:
    """One scenario: trigger + conditions + default action + assignments."""

    id: str
    name: str
    enabled: bool = True
    trigger: Trigger = field(default_factory=Trigger)
    random_window_min: int = 0
    random_direction: str = RANDOM_DIRECTION_BOTH
    weekdays: list[str] = field(default_factory=lambda: list(WEEKDAYS))
    conditions: list[Condition] = field(default_factory=list)
    retry_window_min: int = DEFAULT_RETRY_WINDOW_MIN
    action: CoverAction = field(default_factory=CoverAction)
    assignments: list[Assignment] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        """Serialize to JSON-compatible dict."""
        return {
            "id": self.id,
            "name": self.name,
            "enabled": self.enabled,
            "trigger": self.trigger.to_dict(),
            "random_window_min": self.random_window_min,
            "random_direction": self.random_direction,
            "weekdays": list(self.weekdays),
            "conditions": [c.to_dict() for c in self.conditions],
            "retry_window_min": self.retry_window_min,
            "action": self.action.to_dict(),
            "assignments": [a.to_dict() for a in self.assignments],
        }

    @staticmethod
    def from_dict(data: dict[str, Any]) -> Scenario:
        """Deserialize from store/WS dict."""
        weekdays = [d for d in (data.get("weekdays") or []) if d in WEEKDAYS]
        if not weekdays:
            weekdays = list(WEEKDAYS)
        return Scenario(
            id=str(data.get("id") or new_id()),
            name=str(data.get("name") or "Scenario"),
            enabled=bool(data.get("enabled", True)),
            trigger=Trigger.from_dict(data.get("trigger") or {}),
            random_window_min=_clamp(
                data.get("random_window_min", 0), 0, MAX_RANDOM_WINDOW_MIN, 0
            ),
            random_direction=_enum(
                data.get("random_direction"), RANDOM_DIRECTIONS, RANDOM_DIRECTION_BOTH
            ),
            weekdays=weekdays,
            conditions=[Condition.from_dict(c) for c in (data.get("conditions") or [])],
            retry_window_min=_clamp(
                data.get("retry_window_min", DEFAULT_RETRY_WINDOW_MIN),
                0,
                MAX_RETRY_WINDOW_MIN,
                DEFAULT_RETRY_WINDOW_MIN,
            ),
            action=CoverAction.from_dict(data.get("action") or {}),
            assignments=[
                Assignment.from_dict(a) for a in (data.get("assignments") or [])
            ],
        )


@dataclass
class SafetyConfig:
    """Safety rule settings per cover (contact open → protect the window)."""

    ventilation_position: int = DEFAULT_VENTILATION_POSITION
    mode: str = SAFETY_MODE_BLOCK
    block_when_tilted: bool = False

    def to_dict(self) -> dict[str, Any]:
        """Serialize to JSON-compatible dict."""
        return {
            "ventilation_position": self.ventilation_position,
            "mode": self.mode,
            "block_when_tilted": self.block_when_tilted,
        }

    @staticmethod
    def from_dict(data: dict[str, Any]) -> SafetyConfig:
        """Deserialize from store/WS dict."""
        return SafetyConfig(
            ventilation_position=_clamp(
                data.get("ventilation_position", DEFAULT_VENTILATION_POSITION),
                0,
                100,
                DEFAULT_VENTILATION_POSITION,
            ),
            mode=_enum(data.get("mode"), SAFETY_MODES, SAFETY_MODE_BLOCK),
            block_when_tilted=bool(data.get("block_when_tilted", False)),
        )


@dataclass
class CoverItem:
    """One managed cover (shutter, blind, awning, curtain, shade, other)."""

    id: str
    name: str
    cover_entity_id: str
    kind: str = KIND_OTHER
    area_id: str | None = None
    azimuth: int | None = None
    low_mode_entity_id: str | None = None
    low_mode_script_id: str | None = None
    contact_entity_id: str | None = None
    contact_state_map: dict[str, str] = field(default_factory=dict)
    safety: SafetyConfig = field(default_factory=SafetyConfig)
    enabled: bool = True

    def to_dict(self) -> dict[str, Any]:
        """Serialize to JSON-compatible dict."""
        return {
            "id": self.id,
            "name": self.name,
            "cover_entity_id": self.cover_entity_id,
            "kind": self.kind,
            "area_id": self.area_id,
            "azimuth": self.azimuth,
            "low_mode_entity_id": self.low_mode_entity_id,
            "low_mode_script_id": self.low_mode_script_id,
            "contact_entity_id": self.contact_entity_id,
            "contact_state_map": dict(self.contact_state_map),
            "safety": self.safety.to_dict(),
            "enabled": self.enabled,
        }

    @staticmethod
    def from_dict(data: dict[str, Any]) -> CoverItem:
        """Deserialize from store/WS dict."""
        raw_map = data.get("contact_state_map") or {}
        contact_map = {str(k): v for k, v in raw_map.items() if v in CONTACT_STATES}
        return CoverItem(
            id=str(data.get("id") or new_id()),
            name=str(data.get("name") or "Cover"),
            cover_entity_id=str(data["cover_entity_id"]),
            kind=_enum(data.get("kind"), KINDS, KIND_OTHER),
            area_id=_str_or_none(data.get("area_id")),
            azimuth=_clamp_opt(data.get("azimuth"), 0, 359),
            low_mode_entity_id=_str_or_none(data.get("low_mode_entity_id")),
            low_mode_script_id=_str_or_none(data.get("low_mode_script_id")),
            contact_entity_id=_str_or_none(data.get("contact_entity_id")),
            contact_state_map=contact_map,
            safety=SafetyConfig.from_dict(data.get("safety") or {}),
            enabled=bool(data.get("enabled", True)),
        )


@dataclass
class EntryConfig:
    """Global per-config-entry settings."""

    name: str = "Advanced Cover"
    enabled: bool = True  # master switch
    default_min_position_delta: int = DEFAULT_MIN_POSITION_DELTA
    favorite_entity_ids: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        """Serialize to JSON-compatible dict."""
        return {
            "name": self.name,
            "enabled": self.enabled,
            "default_min_position_delta": self.default_min_position_delta,
            "favorite_entity_ids": list(self.favorite_entity_ids),
        }

    @staticmethod
    def from_dict(data: dict[str, Any]) -> EntryConfig:
        """Deserialize from store/WS dict."""
        favorites = [
            s
            for s in (str(x).strip() for x in data.get("favorite_entity_ids") or [])
            if s
        ]
        return EntryConfig(
            name=str(data.get("name") or "Advanced Cover"),
            enabled=bool(data.get("enabled", True)),
            default_min_position_delta=_clamp(
                data.get("default_min_position_delta", DEFAULT_MIN_POSITION_DELTA),
                0,
                100,
                DEFAULT_MIN_POSITION_DELTA,
            ),
            favorite_entity_ids=favorites,
        )


@dataclass
class EntryData:
    """Complete persisted configuration of one config entry."""

    config: EntryConfig = field(default_factory=EntryConfig)
    covers: dict[str, CoverItem] = field(default_factory=dict)
    scenarios: list[Scenario] = field(default_factory=list)  # order = priority

    def scenario_by_id(self, scenario_id: str) -> Scenario | None:
        """Return scenario by id or ``None``."""
        return next((s for s in self.scenarios if s.id == scenario_id), None)

    def to_dict(self) -> dict[str, Any]:
        """Serialize to JSON-compatible dict."""
        return {
            "config": self.config.to_dict(),
            "covers": {cid: c.to_dict() for cid, c in self.covers.items()},
            "scenarios": [s.to_dict() for s in self.scenarios],
        }

    @staticmethod
    def from_dict(data: dict[str, Any]) -> EntryData:
        """Deserialize from store dict."""
        covers_raw = data.get("covers") or {}
        covers: dict[str, CoverItem] = {}
        if isinstance(covers_raw, dict):
            for cid, cdata in covers_raw.items():
                item = CoverItem.from_dict(cdata)
                covers[str(cid)] = item
        scenarios = [Scenario.from_dict(s) for s in (data.get("scenarios") or [])]
        return EntryData(
            config=EntryConfig.from_dict(data.get("config") or {}),
            covers=covers,
            scenarios=scenarios,
        )
