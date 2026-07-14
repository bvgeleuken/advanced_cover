"""Tests for the config flow."""

from __future__ import annotations

from custom_components.advanced_cover.const import DOMAIN
from homeassistant import config_entries
from homeassistant.core import HomeAssistant


async def test_user_flow_creates_entry(hass: HomeAssistant) -> None:
    result = await hass.config_entries.flow.async_init(
        DOMAIN, context={"source": config_entries.SOURCE_USER}
    )
    assert result["type"] == "form"
    assert result["step_id"] == "user"

    result = await hass.config_entries.flow.async_configure(
        result["flow_id"],
        {"name": "My covers", "default_min_position_delta": 5},
    )
    assert result["type"] == "create_entry"
    assert result["title"] == "My covers"
    assert result["data"]["name"] == "My covers"
    assert result["data"]["default_min_position_delta"] == 5


async def test_user_flow_rejects_empty_name(hass: HomeAssistant) -> None:
    result = await hass.config_entries.flow.async_init(
        DOMAIN, context={"source": config_entries.SOURCE_USER}
    )
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"],
        {"name": "   ", "default_min_position_delta": 3},
    )
    assert result["type"] == "form"
    assert result["errors"] == {"name": "name_required"}
