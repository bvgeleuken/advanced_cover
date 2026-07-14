"""Cover capability detection and contact sensor state mapping.

Pure helpers on top of HA state objects; no service calls, no timers.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from homeassistant.components.cover import CoverEntityFeature
from homeassistant.const import STATE_OFF, STATE_ON, STATE_UNAVAILABLE, STATE_UNKNOWN
from homeassistant.core import HomeAssistant, State

from .const import (
    CONTACT_CLOSED,
    CONTACT_OPEN,
    CONTACT_TILTED,
    CONTACT_UNKNOWN,
    KIND_AWNING,
    KIND_BLIND,
    KIND_CURTAIN,
    KIND_OTHER,
    KIND_SHADE,
    KIND_SHUTTER,
)

# device_class → default kind (presentation default only, user can override).
_DEVICE_CLASS_TO_KIND: dict[str, str] = {
    "shutter": KIND_SHUTTER,
    "blind": KIND_BLIND,
    "awning": KIND_AWNING,
    "curtain": KIND_CURTAIN,
    "shade": KIND_SHADE,
    "window": KIND_SHUTTER,
    "garage": KIND_OTHER,
    "door": KIND_OTHER,
    "gate": KIND_OTHER,
    "damper": KIND_OTHER,
}

# Common raw states of three-state window handle sensors → contact abstraction.
_KNOWN_CONTACT_STATES: dict[str, str] = {
    "closed": CONTACT_CLOSED,
    "tilted": CONTACT_TILTED,
    "open": CONTACT_OPEN,
    "0": CONTACT_CLOSED,
    "1": CONTACT_TILTED,
    "2": CONTACT_OPEN,
}


@dataclass(frozen=True)
class CoverCapabilities:
    """What the underlying cover entity supports."""

    supports_position: bool = False
    supports_tilt: bool = False
    supports_open_close: bool = False
    available: bool = False

    def to_dict(self) -> dict[str, Any]:
        """Serialize for the WebSocket API."""
        return {
            "supports_position": self.supports_position,
            "supports_tilt": self.supports_tilt,
            "supports_open_close": self.supports_open_close,
            "available": self.available,
        }


def capabilities_from_state(state: State | None) -> CoverCapabilities:
    """Derive capabilities from a cover state object."""
    if state is None or state.state == STATE_UNAVAILABLE:
        return CoverCapabilities()
    features = CoverEntityFeature(state.attributes.get("supported_features", 0) or 0)
    return CoverCapabilities(
        supports_position=CoverEntityFeature.SET_POSITION in features,
        supports_tilt=CoverEntityFeature.SET_TILT_POSITION in features,
        supports_open_close=(
            CoverEntityFeature.OPEN in features or CoverEntityFeature.CLOSE in features
        ),
        available=True,
    )


def get_cover_capabilities(hass: HomeAssistant, entity_id: str) -> CoverCapabilities:
    """Read capabilities of a cover entity from the state machine."""
    return capabilities_from_state(hass.states.get(entity_id))


def default_kind_for_state(state: State | None) -> str:
    """Suggest a cover kind from the entity's ``device_class``."""
    if state is None:
        return KIND_OTHER
    device_class = state.attributes.get("device_class")
    if not device_class:
        return KIND_OTHER
    return _DEVICE_CLASS_TO_KIND.get(str(device_class), KIND_OTHER)


def default_contact_map(state: State | None) -> dict[str, str]:
    """Suggest a contact state map for a freshly picked contact entity.

    Binary sensors get the standard on/off mapping. For multi-state handle
    sensors we prefill from well-known state names; anything unknown stays
    unmapped and must be assigned by the user in the panel.
    """
    if state is None:
        return {}
    if state.domain == "binary_sensor" or state.state in (STATE_ON, STATE_OFF):
        return {STATE_OFF: CONTACT_CLOSED, STATE_ON: CONTACT_OPEN}
    raw = str(state.state).strip().lower()
    if raw not in _KNOWN_CONTACT_STATES:
        return {}
    # Prefill the family (named vs. numeric) the sensor's current state belongs to.
    numeric = raw.isdigit()
    return {k: v for k, v in _KNOWN_CONTACT_STATES.items() if k.isdigit() == numeric}


def resolve_contact_state(
    raw_state: str | None, contact_state_map: dict[str, str]
) -> str:
    """Map a raw sensor state to the contact abstraction.

    Unmapped, unknown or unavailable states resolve to ``unknown`` — the
    engine and the safety rule treat that as fail-safe.
    """
    if raw_state is None or raw_state in (STATE_UNKNOWN, STATE_UNAVAILABLE):
        return CONTACT_UNKNOWN
    return contact_state_map.get(raw_state, CONTACT_UNKNOWN)
