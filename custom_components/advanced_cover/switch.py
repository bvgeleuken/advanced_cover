"""Switch platform: master switch + per-cover automation switches."""

from __future__ import annotations

from typing import Any

from homeassistant.components.switch import SwitchEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .const import DOMAIN
from .coordinator import AdvancedCoverCoordinator
from .entity import AdvancedCoverEntity


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up switches, following covers added later via the panel."""
    coordinator: AdvancedCoverCoordinator = hass.data[DOMAIN][entry.entry_id][
        "coordinator"
    ]
    known: set[str] = set()

    @callback
    def _sync_cover_entities() -> None:
        new_entities = []
        for cover_id in coordinator.data_model.covers:
            if cover_id not in known:
                known.add(cover_id)
                new_entities.append(CoverAutomationSwitch(coordinator, cover_id))
        if new_entities:
            async_add_entities(new_entities)

    async_add_entities([MasterSwitch(coordinator)])
    _sync_cover_entities()
    entry.async_on_unload(coordinator.async_add_listener(_sync_cover_entities))


class MasterSwitch(AdvancedCoverEntity, SwitchEntity):
    """Enable/disable all automation of this entry."""

    _attr_translation_key = "master"

    def __init__(self, coordinator: AdvancedCoverCoordinator) -> None:
        """Initialize."""
        super().__init__(coordinator, "master")

    @property
    def is_on(self) -> bool:
        """Master enabled."""
        return self.coordinator.data_model.config.enabled

    async def async_turn_on(self, **kwargs: Any) -> None:
        """Enable automation."""
        self.coordinator.data_model.config.enabled = True
        await self.coordinator.async_save_and_notify()

    async def async_turn_off(self, **kwargs: Any) -> None:
        """Disable automation."""
        self.coordinator.data_model.config.enabled = False
        await self.coordinator.async_save_and_notify()


class CoverAutomationSwitch(AdvancedCoverEntity, SwitchEntity):
    """Enable/disable automation for one cover."""

    _attr_translation_key = "cover_automation"

    def __init__(
        self, coordinator: AdvancedCoverCoordinator, cover_item_id: str
    ) -> None:
        """Initialize."""
        super().__init__(coordinator, f"cover_{cover_item_id}_automation")
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
    def is_on(self) -> bool | None:
        """Automation enabled for this cover."""
        cover = self.coordinator.cover_by_id(self._cover_item_id)
        return cover.enabled if cover else None

    async def _async_set_enabled(self, enabled: bool) -> None:
        cover = self.coordinator.cover_by_id(self._cover_item_id)
        if cover is None:
            return
        cover.enabled = enabled
        await self.coordinator.async_save_and_notify()

    async def async_turn_on(self, **kwargs: Any) -> None:
        """Enable automation for this cover."""
        await self._async_set_enabled(True)

    async def async_turn_off(self, **kwargs: Any) -> None:
        """Disable automation for this cover."""
        await self._async_set_enabled(False)
