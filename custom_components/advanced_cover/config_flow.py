"""Config flow for Advanced Cover (entry basics only; the panel does the rest)."""

from __future__ import annotations

from typing import Any

import voluptuous as vol
from homeassistant import config_entries
from homeassistant.helpers.selector import (
    NumberSelector,
    NumberSelectorConfig,
    TextSelector,
)

from .const import DEFAULT_MIN_POSITION_DELTA, DOMAIN


class AdvancedCoverConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """First-time config flow: name and global defaults only."""

    VERSION = 1

    async def async_step_user(
        self, user_input: dict[str, Any] | None = None
    ) -> config_entries.ConfigFlowResult:
        """Prompt for entry basics."""
        errors: dict[str, str] = {}
        if user_input is not None:
            name = str(user_input["name"]).strip()
            if not name:
                errors["name"] = "name_required"
            if not errors:
                return self.async_create_entry(
                    title=name,
                    data={
                        "name": name,
                        "default_min_position_delta": int(
                            user_input["default_min_position_delta"]
                        ),
                    },
                )

        schema = vol.Schema(
            {
                vol.Required("name", default="Advanced Cover"): TextSelector(),
                vol.Required(
                    "default_min_position_delta",
                    default=DEFAULT_MIN_POSITION_DELTA,
                ): NumberSelector(NumberSelectorConfig(min=0, max=100, mode="box")),
            }
        )
        return self.async_show_form(step_id="user", data_schema=schema, errors=errors)
