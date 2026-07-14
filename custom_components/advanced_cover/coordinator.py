"""Coordinator holding entry data, day plan and the action log."""

from __future__ import annotations

import logging
from collections import deque
from typing import TYPE_CHECKING, Any

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator
from homeassistant.util import dt as dt_util

from .const import DOMAIN, EVENT_ACTION, EVENT_LOG_SIZE
from .models import CoverItem, EntryData
from .store import AdvancedCoverStore

if TYPE_CHECKING:
    from .scheduler import Occurrence

_LOGGER = logging.getLogger(__name__)


class AdvancedCoverCoordinator(DataUpdateCoordinator[dict[str, Any]]):
    """Holds configuration + volatile runtime state, notifies listeners."""

    def __init__(
        self,
        hass: HomeAssistant,
        entry: ConfigEntry,
        store: AdvancedCoverStore,
    ) -> None:
        """Initialize coordinator."""
        super().__init__(
            hass, _LOGGER, config_entry=entry, name=DOMAIN, update_interval=None
        )
        self.store = store
        # Volatile per-day state, rebuilt at midnight/restart (plan: no tracking).
        self.day_plan: list[Occurrence] = []
        self.action_log: deque[dict[str, Any]] = deque(maxlen=EVENT_LOG_SIZE)

    @property
    def data_model(self) -> EntryData:
        """Return the persisted entry data."""
        return self.store.data

    def cover_by_id(self, cover_item_id: str) -> CoverItem | None:
        """Return cover item by id or ``None``."""
        return self.store.data.covers.get(cover_item_id)

    async def _async_update_data(self) -> dict[str, Any]:
        """Unused polling path — state is pushed via async_update_listeners."""
        return {"data": self.store.data}

    async def async_save_and_notify(self) -> None:
        """Persist entry data, notify entities/panel and reschedule."""
        await self.store.async_save()
        self.async_update_listeners()
        domain_data = self.hass.data.get(DOMAIN, {}).get(self.config_entry.entry_id)
        if domain_data and (scheduler := domain_data.get("scheduler")):
            await scheduler.async_rebuild_plan()

    def set_day_plan(self, plan: list[Occurrence]) -> None:
        """Replace the day plan and notify listeners."""
        self.day_plan = plan
        self.async_update_listeners()

    def notify_plan_changed(self) -> None:
        """Notify listeners after in-place plan mutation (e.g. re-arm fired)."""
        self.async_update_listeners()

    def log_action(
        self,
        *,
        scenario_id: str,
        scenario_name: str,
        cover_item_id: str,
        cover_name: str,
        result: str,
        reason: str | None = None,
        position: int | None = None,
    ) -> None:
        """Append to the action log and fire the observability event."""
        entry = {
            "time": dt_util.now().isoformat(),
            "scenario_id": scenario_id,
            "scenario_name": scenario_name,
            "cover_item_id": cover_item_id,
            "cover_name": cover_name,
            "result": result,
            "reason": reason,
            "position": position,
        }
        self.action_log.appendleft(entry)
        self.hass.bus.async_fire(
            EVENT_ACTION,
            {
                "config_entry_id": self.config_entry.entry_id,
                "scenario_id": scenario_id,
                "cover_item_id": cover_item_id,
                "result": result,
                "reason": reason,
                "position": position,
            },
        )
        self.async_update_listeners()
