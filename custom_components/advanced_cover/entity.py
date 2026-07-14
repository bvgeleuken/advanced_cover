"""Base entity for Advanced Cover."""

from __future__ import annotations

from homeassistant.helpers.device_registry import DeviceInfo
from homeassistant.helpers.update_coordinator import CoordinatorEntity

from .const import DOMAIN
from .coordinator import AdvancedCoverCoordinator


class AdvancedCoverEntity(CoordinatorEntity[AdvancedCoverCoordinator]):
    """Base entity bound to the config entry device."""

    _attr_has_entity_name = True

    def __init__(
        self,
        coordinator: AdvancedCoverCoordinator,
        unique_id_suffix: str,
    ) -> None:
        """Initialize entity."""
        super().__init__(coordinator)
        entry = coordinator.config_entry
        self._attr_unique_id = f"{entry.entry_id}_{unique_id_suffix}"
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, entry.entry_id)},
            name=coordinator.data_model.config.name,
            manufacturer="Florian Bäthge",
            model="Advanced Cover",
        )
