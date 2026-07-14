"""Constants for Advanced Cover."""

from typing import Final

from .version import __version__

DOMAIN: Final = "advanced_cover"

INTEGRATION_VERSION: Final = __version__

# Full HA configuration dict from async_setup; needed for
# async_setup_component(..., config).
HASS_CONFIG_KEY: Final = "_hass_config"

CUSTOM_COMPONENTS: Final = "custom_components"
INTEGRATION_FOLDER: Final = DOMAIN
PANEL_FOLDER: Final = "frontend"
PANEL_FILENAME: Final = "dist/advanced-cover-panel.js"
PANEL_URL_PATH: Final = "/api/advanced_cover/panel.js"
PANEL_WEBCOMPONENT: Final = "advanced-cover-panel"
PANEL_TITLE: Final = "Advanced Cover"
PANEL_ICON: Final = "mdi:window-shutter-cog"
PANEL_FRONTEND_PATH: Final = "advanced-cover"

PANEL_REGISTERED_KEY: Final = "_advanced_cover_panel_registered"
WEBSOCKET_REGISTERED_KEY: Final = "_advanced_cover_websocket_registered"
# aiohttp static routes cannot be removed, so this flag is never popped
# (unlike PANEL_REGISTERED_KEY, which is cleared on unload).
PANEL_STATIC_REGISTERED_KEY: Final = "_advanced_cover_panel_static_registered"

STORE_VERSION: Final = 1

# --- Cover kinds (presentation only, never engine logic) ---
KIND_SHUTTER: Final = "shutter"
KIND_BLIND: Final = "blind"
KIND_AWNING: Final = "awning"
KIND_CURTAIN: Final = "curtain"
KIND_SHADE: Final = "shade"
KIND_OTHER: Final = "other"
KINDS: Final = (
    KIND_SHUTTER,
    KIND_BLIND,
    KIND_AWNING,
    KIND_CURTAIN,
    KIND_SHADE,
    KIND_OTHER,
)
# Kinds for which a window contact sensor (and thus the safety rule) makes sense.
CONTACT_KINDS: Final = frozenset(
    {KIND_SHUTTER, KIND_BLIND, KIND_CURTAIN, KIND_SHADE, KIND_OTHER}
)

# --- Triggers ---
TRIGGER_FIXED_TIME: Final = "fixed_time"
TRIGGER_SUN_EVENT: Final = "sun_event"
TRIGGER_TYPES: Final = (TRIGGER_FIXED_TIME, TRIGGER_SUN_EVENT)

SUN_EVENT_SUNRISE: Final = "sunrise"
SUN_EVENT_SUNSET: Final = "sunset"
SUN_EVENT_SOLAR_NOON: Final = "solar_noon"
SUN_EVENTS: Final = (SUN_EVENT_SUNRISE, SUN_EVENT_SUNSET, SUN_EVENT_SOLAR_NOON)

RANDOM_DIRECTION_AFTER: Final = "after"
RANDOM_DIRECTION_BEFORE: Final = "before"
RANDOM_DIRECTION_BOTH: Final = "both"
RANDOM_DIRECTIONS: Final = (
    RANDOM_DIRECTION_AFTER,
    RANDOM_DIRECTION_BEFORE,
    RANDOM_DIRECTION_BOTH,
)
MAX_RANDOM_WINDOW_MIN: Final = 120
MAX_RETRY_WINDOW_MIN: Final = 24 * 60

# --- Conditions (tagged union) ---
COND_ENTITY_STATE: Final = "entity_state"
COND_ENTITY_STATE_NOT: Final = "entity_state_not"
COND_COVER_POSITION: Final = "cover_position"
COND_CONTACT: Final = "contact"
COND_NUMERIC_STATE: Final = "numeric_state"
CONDITION_TYPES: Final = (
    COND_ENTITY_STATE,
    COND_ENTITY_STATE_NOT,
    COND_COVER_POSITION,
    COND_CONTACT,
    COND_NUMERIC_STATE,
)

POSITION_OP_ABOVE: Final = "above"
POSITION_OP_BELOW: Final = "below"
POSITION_OP_BETWEEN: Final = "between"
POSITION_OPS: Final = (POSITION_OP_ABOVE, POSITION_OP_BELOW, POSITION_OP_BETWEEN)

# --- Contact abstraction ---
CONTACT_CLOSED: Final = "closed"
CONTACT_TILTED: Final = "tilted"
CONTACT_OPEN: Final = "open"
CONTACT_UNKNOWN: Final = "unknown"
CONTACT_STATES: Final = (CONTACT_CLOSED, CONTACT_TILTED, CONTACT_OPEN)

# --- Action modes ---
MODE_NORMAL: Final = "normal"
MODE_LOW: Final = "low"
ACTION_MODES: Final = (MODE_NORMAL, MODE_LOW)

DEFAULT_MIN_POSITION_DELTA: Final = 3
DEFAULT_RETRY_WINDOW_MIN: Final = 0
# Safety rule: with an open window contact, closing moves below this position
# are blocked/clamped. 20% keeps a ventilation gap by default.
DEFAULT_VENTILATION_POSITION: Final = 20

# --- Safety rule ---
SAFETY_MODE_BLOCK: Final = "block"
SAFETY_MODE_CLAMP: Final = "clamp"
SAFETY_MODES: Final = (SAFETY_MODE_BLOCK, SAFETY_MODE_CLAMP)

# --- Per-assignment daily run states ---
RUN_STATE_IDLE: Final = "idle"
RUN_STATE_ARMED: Final = "armed"
RUN_STATE_DONE: Final = "done"
RUN_STATE_EXPIRED: Final = "expired"

# --- Execution results (event payload + log) ---
RESULT_EXECUTED: Final = "executed"
RESULT_SKIPPED: Final = "skipped"
RESULT_ARMED: Final = "armed"
RESULT_EXPIRED: Final = "expired"
RESULT_BLOCKED_SAFETY: Final = "blocked_safety"
RESULT_UNAVAILABLE: Final = "unavailable"

EVENT_ACTION: Final = f"{DOMAIN}_action"

# --- Services ---
SERVICE_RUN_SCENARIO: Final = "run_scenario"
SERVICE_RUN_SCENARIO_FOR_COVER: Final = "run_scenario_for_cover"
SERVICE_RECALCULATE_SCHEDULE: Final = "recalculate_schedule"
SERVICE_SET_COVER_ENABLED: Final = "set_cover_enabled"

ATTR_CONFIG_ENTRY_ID: Final = "config_entry_id"
ATTR_SCENARIO_ID: Final = "scenario_id"
ATTR_COVER_ITEM_ID: Final = "cover_item_id"
ATTR_ENABLED: Final = "enabled"
ATTR_IGNORE_CONDITIONS: Final = "ignore_conditions"

WEEKDAYS: Final = ("mon", "tue", "wed", "thu", "fri", "sat", "sun")

# Number of recent action log entries kept in memory for the panel.
EVENT_LOG_SIZE: Final = 100
