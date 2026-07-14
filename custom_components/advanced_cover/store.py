"""Persistent JSON storage for Advanced Cover (versioned, per config entry)."""

from __future__ import annotations

import logging
from typing import Any

from homeassistant.core import HomeAssistant
from homeassistant.helpers.storage import Store

from .const import DOMAIN, STORE_VERSION
from .models import EntryData

_LOGGER = logging.getLogger(__name__)


def _migrate_data(data: dict[str, Any], version: int) -> dict[str, Any]:
    """Apply migrations from older store versions."""
    if version < 1:
        data = {"version": STORE_VERSION, "data": {}}
    # Future: if version == 1: ...
    data["version"] = STORE_VERSION
    return data


class AdvancedCoverStore:
    """Load/save the entry configuration."""

    def __init__(self, hass: HomeAssistant, entry_id: str) -> None:
        """Initialize store for a config entry."""
        self.hass = hass
        self.entry_id = entry_id
        self._store: Store[dict[str, Any]] = Store(
            hass,
            STORE_VERSION,
            f"{DOMAIN}.{entry_id}",
        )
        self.data: EntryData = EntryData()

    async def async_load(self, initial: EntryData | None = None) -> EntryData:
        """Load from disk; if missing, persist ``initial`` (first run)."""
        raw = await self._store.async_load()
        if not raw:
            self.data = initial if initial is not None else EntryData()
            await self.async_save()
            return self.data

        version = int(raw.get("version", 1))
        if version != STORE_VERSION:
            raw = _migrate_data(raw, version)

        self.data = EntryData.from_dict(raw.get("data") or {})
        return self.data

    async def async_save(self) -> None:
        """Persist current entry data."""
        payload = {
            "version": STORE_VERSION,
            "data": self.data.to_dict(),
        }
        await self._store.async_save(payload)

    async def async_remove(self) -> None:
        """Delete the store file (entry removed)."""
        await self._store.async_remove()
