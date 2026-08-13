"""Regression tests for the native Home Assistant entity selectors.

The panel is TypeScript, so the checks below read the frontend source. They are
deliberately limited to what a Python test can state better than a linter: that
the domains the panel offers never contradict the domains the integration
actually addresses, and that the fields the backend leaves domain-agnostic stay
open to any entity. Everything is matched against whitespace-collapsed source,
so reformatting the panel cannot break these tests.
"""

from __future__ import annotations

import re
from pathlib import Path

import pytest
from custom_components.advanced_cover.const import SCRIPT_DOMAIN
from homeassistant.components.cover import DOMAIN as COVER_DOMAIN

ROOT = Path(__file__).parents[1]
FRONTEND = ROOT / "custom_components/advanced_cover/frontend/src"


def _squeeze(text: str) -> str:
    """Collapse whitespace so indentation and line breaks stop mattering."""
    return re.sub(r"\s+", " ", text)


def _source(relative: str) -> str:
    return _squeeze((FRONTEND / relative).read_text(encoding="utf-8"))


def _frontend_source() -> str:
    return _squeeze(
        "\n".join(p.read_text(encoding="utf-8") for p in sorted(FRONTEND.rglob("*.ts")))
    )


def _picker_domains(relative: str, label_key: str) -> set[str]:
    """The domain list of the `renderEntityField` call carrying `label_key`.

    The call reads ``renderEntityField(hass, [domains], t(hass, label), …)``, so
    the domain array is the argument right before the label.
    """
    match = re.search(
        rf"renderEntityField\(\s*[^,]+,\s*\[([^\]]*)\],\s*t\(\s*[^,]+,\s*"
        rf'"config_panel\.{label_key}"\s*\)',
        _source(relative),
    )
    assert match, f"no renderEntityField call labelled {label_key} in {relative}"
    return set(re.findall(r'"([^"]+)"', match.group(1)))


def _allows_custom(relative: str, label_key: str) -> bool:
    """Whether the picker labelled `label_key` accepts entities it does not list."""
    source = _source(relative)
    start = source.index(f'"config_panel.{label_key}"')
    # Up to the start of the next picker, or the end of the file.
    nxt = source.find("renderEntityField(", start)
    return "allowCustom: true" in source[start : nxt if nxt != -1 else len(source)]


@pytest.mark.parametrize(
    "label_key", ["covers_field_entity", "covers_field_low_entity"]
)
def test_cover_pickers_filter_on_the_domain_the_executor_addresses(
    label_key: str,
) -> None:
    """`CoverExecutor` calls `cover.*` services on both, so filtering is safe."""
    assert _picker_domains("views/view-covers.ts", label_key) == {COVER_DOMAIN}


def test_low_mode_script_picker_filters_on_the_script_domain() -> None:
    """The executor calls `script.<object_id>`; nothing else can work here."""
    assert _picker_domains("views/view-covers.ts", "covers_field_low_script") == {
        SCRIPT_DOMAIN
    }


@pytest.mark.parametrize(
    "label_key",
    ["covers_field_entity", "covers_field_low_entity", "covers_field_low_script"],
)
def test_backend_enforced_pickers_keep_their_filter(label_key: str) -> None:
    """These three are addressed by service calls — do not weaken them."""
    assert not _allows_custom("views/view-covers.ts", label_key)


def test_contact_picker_stays_open_to_any_entity() -> None:
    """The contact sensor is only read and run through `contact_state_map`.

    Its domain list ranks the suggestions; turning it into a picker filter would
    lock out working setups (a handle helper on `input_select.window`), so the
    picker must allow entities outside the suggested domains.
    """
    assert _allows_custom("views/view-covers.ts", "covers_field_contact")


def test_condition_entity_picker_offers_every_domain() -> None:
    """`evaluate_condition_eval` puts no domain rule on `cond.entity_id`.

    `null` domains means no filter at all, and `allowCustom` keeps an entity_id
    whose integration is currently unloaded selectable.
    """
    source = _source("condition-editor.ts")

    assert "renderEntityField( opts.hass, null," in source
    assert "allowCustom: true" in source


def test_panel_hands_back_the_entity_id_the_picker_selected() -> None:
    """The stored value stays an entity_id, so no config migration is needed."""
    entity_input = _source("entity-input.ts")

    assert "<ha-entity-picker" in entity_input
    assert 'onValue(e.detail.value ?? "")' in entity_input


def test_state_fields_use_the_native_state_selector() -> None:
    """Condition states and contact-map keys are raw states of a chosen entity."""
    entity_input = _source("entity-input.ts")

    assert "<ha-selector" in entity_input
    assert "state: { entity_id:" in entity_input


def test_panel_no_longer_builds_its_own_entity_lists() -> None:
    """The whole point of the native picker: no hand-rolled option list is left.

    `ac-areas-list` is exempt — areas are not entities and keep their datalist.
    """
    source = _frontend_source()

    assert "Object.keys(hass.states)" not in source
    assert "renderEntityDatalist" not in source
    assert re.findall(r"<datalist\s+id=\"([^\"]+)\"", source) == ["ac-areas-list"]


def test_panel_startup_cannot_block_on_a_missing_element() -> None:
    """`whenDefined` never rejects; without a timeout a lazy tag blanks the panel."""
    source = _source("load-ha-elements.ts")

    assert "Promise.race" in source
    for tag in ("ha-entity-picker", "ha-selector"):
        assert f'"{tag}"' in source
