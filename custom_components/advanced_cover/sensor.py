"""Sensor platform: next planned action per cover and globally."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from homeassistant.components.sensor import SensorDeviceClass, SensorEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.util import dt as dt_util

from .const import DOMAIN
from .coordinator import AdvancedCoverCoordinator
from .entity import AdvancedCoverEntity
from .scheduler import AdvancedCoverScheduler


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up sensors, following covers added later via the panel."""
    domain_data = hass.data[DOMAIN][entry.entry_id]
    coordinator: AdvancedCoverCoordinator = domain_data["coordinator"]
    scheduler: AdvancedCoverScheduler = domain_data["scheduler"]
    known: set[str] = set()

    @callback
    def _sync_cover_entities() -> None:
        new_entities = []
        for cover_id in coordinator.data_model.covers:
            if cover_id not in known:
                known.add(cover_id)
                new_entities.append(
                    CoverNextActionSensor(coordinator, scheduler, cover_id)
                )
        if new_entities:
            async_add_entities(new_entities)

    async_add_entities([GlobalNextRunSensor(coordinator, scheduler)])
    _sync_cover_entities()
    entry.async_on_unload(coordinator.async_add_listener(_sync_cover_entities))


def _parse_when(info: dict[str, Any] | None) -> datetime | None:
    """Parse the ISO ``when`` field of a next-action dict."""
    if not info or not info.get("when"):
        return None
    return dt_util.parse_datetime(info["when"])


class GlobalNextRunSensor(AdvancedCoverEntity, SensorEntity):
    """Next planned action across all covers."""

    _attr_translation_key = "next_run"
    _attr_device_class = SensorDeviceClass.TIMESTAMP

    def __init__(
        self,
        coordinator: AdvancedCoverCoordinator,
        scheduler: AdvancedCoverScheduler,
    ) -> None:
        """Initialize."""
        super().__init__(coordinator, "next_run")
        self._scheduler = scheduler

    @property
    def native_value(self) -> datetime | None:
        """Time of the next planned action."""
        return _parse_when(self._scheduler.next_action_global())

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        """Scenario and covers of the next action."""
        return self._scheduler.next_action_global() or {}


class CoverNextActionSensor(AdvancedCoverEntity, SensorEntity):
    """Next planned action for one cover, including armed state."""

    _attr_translation_key = "next_action"
    _attr_device_class = SensorDeviceClass.TIMESTAMP

    def __init__(
        self,
        coordinator: AdvancedCoverCoordinator,
        scheduler: AdvancedCoverScheduler,
        cover_item_id: str,
    ) -> None:
        """Initialize."""
        super().__init__(coordinator, f"cover_{cover_item_id}_next_action")
        self._scheduler = scheduler
        self._cover_item_id = cover_item_id
        cover = coordinator.cover_by_id(cover_item_id)
        self._attr_translation_placeholders = {
            "cover_name": cover.name if cover else cover_item_id
        }

    @property
    def available(self) -> bool:
        """Unavailable once the cover item was deleted."""
        return self.coordinator.cover_by_id(self._cover_item_id) is not None

    @property
    def native_value(self) -> datetime | None:
        """Time of the next planned action for this cover."""
        return _parse_when(self._scheduler.next_action_for_cover(self._cover_item_id))

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        """Scenario, target position and armed details."""
        return self._scheduler.next_action_for_cover(self._cover_item_id) or {}
