"""Binary sensor platform: per-cover safety-blocked indicator."""

from __future__ import annotations

from homeassistant.components.binary_sensor import (
    BinarySensorDeviceClass,
    BinarySensorEntity,
)
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import Event, HomeAssistant, callback
from homeassistant.helpers.entity import EntityCategory
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.event import (
    EventStateChangedData,
    async_track_state_change_event,
)

from .capabilities import resolve_contact_state
from .const import CONTACT_OPEN, CONTACT_TILTED, DOMAIN
from .coordinator import AdvancedCoverCoordinator
from .entity import AdvancedCoverEntity


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up binary sensors, following covers added later via the panel."""
    coordinator: AdvancedCoverCoordinator = hass.data[DOMAIN][entry.entry_id][
        "coordinator"
    ]
    known: set[str] = set()

    @callback
    def _sync_cover_entities() -> None:
        new_entities = []
        for cover_id, cover in coordinator.data_model.covers.items():
            if cover_id not in known and cover.contact_entity_id:
                known.add(cover_id)
                new_entities.append(SafetyBlockedBinarySensor(coordinator, cover_id))
        if new_entities:
            async_add_entities(new_entities)

    _sync_cover_entities()
    entry.async_on_unload(coordinator.async_add_listener(_sync_cover_entities))


class SafetyBlockedBinarySensor(AdvancedCoverEntity, BinarySensorEntity):
    """On while the safety rule would block closing this cover."""

    _attr_translation_key = "safety_blocked"
    _attr_device_class = BinarySensorDeviceClass.SAFETY
    _attr_entity_category = EntityCategory.DIAGNOSTIC

    def __init__(
        self, coordinator: AdvancedCoverCoordinator, cover_item_id: str
    ) -> None:
        """Initialize."""
        super().__init__(coordinator, f"cover_{cover_item_id}_safety_blocked")
        self._cover_item_id = cover_item_id
        cover = coordinator.cover_by_id(cover_item_id)
        self._attr_translation_placeholders = {
            "cover_name": cover.name if cover else cover_item_id
        }

    async def async_added_to_hass(self) -> None:
        """Track the contact sensor for live updates."""
        await super().async_added_to_hass()
        cover = self.coordinator.cover_by_id(self._cover_item_id)
        if cover is None or not cover.contact_entity_id:
            return

        @callback
        def _on_contact_change(_event: Event[EventStateChangedData]) -> None:
            self.async_write_ha_state()

        self.async_on_remove(
            async_track_state_change_event(
                self.hass, [cover.contact_entity_id], _on_contact_change
            )
        )

    @property
    def available(self) -> bool:
        """Unavailable once the cover item was deleted."""
        return self.coordinator.cover_by_id(self._cover_item_id) is not None

    @property
    def is_on(self) -> bool | None:
        """True when the contact currently blocks closing moves."""
        cover = self.coordinator.cover_by_id(self._cover_item_id)
        if cover is None or not cover.contact_entity_id:
            return None
        raw = self.hass.states.get(cover.contact_entity_id)
        contact = resolve_contact_state(
            raw.state if raw else None, cover.contact_state_map
        )
        if contact == CONTACT_OPEN:
            return True
        return bool(contact == CONTACT_TILTED and cover.safety.block_when_tilted)
