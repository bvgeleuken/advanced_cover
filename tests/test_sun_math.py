"""Golden tests for the sun-position crossing solver.

Real astral computations for four latitudes that exercise every geometry:
- Magdeburg: northern temperate, azimuth increases through the day
- Sydney: southern temperate, azimuth decreases and wraps 0°/360° at noon
- Singapore: tropics, direction of travel flips with the seasons
- Tromsø: polar day/night, elevation thresholds without any crossing
"""

from __future__ import annotations

from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

from astral import LocationInfo
from astral.sun import noon
from custom_components.advanced_cover.const import SUN_DIR_FALLING, SUN_DIR_RISING
from custom_components.advanced_cover.sun_math import (
    azimuth_crossing,
    elevation_crossing,
    make_angle_funcs,
    wrap180,
)

MAGDEBURG = LocationInfo("Magdeburg", "DE", "Europe/Berlin", 52.13, 11.62)
SYDNEY = LocationInfo("Sydney", "AU", "Australia/Sydney", -33.87, 151.21)
SINGAPORE = LocationInfo("Singapore", "SG", "Asia/Singapore", 1.35, 103.82)
TROMSO = LocationInfo("Tromsø", "NO", "Europe/Oslo", 69.65, 18.96)

CLOSE = timedelta(minutes=5)


def day_window(loc: LocationInfo, day: date) -> tuple[datetime, datetime]:
    tz = ZoneInfo(loc.timezone)
    start = datetime(day.year, day.month, day.day, tzinfo=tz)
    return start, start + timedelta(days=1)


def solar_noon(loc: LocationInfo, day: date) -> datetime:
    return noon(loc.observer, day, tzinfo=ZoneInfo(loc.timezone))


# ------------------------------------------------------------------- wrap180


def test_wrap180():
    assert wrap180(0) == 0
    assert wrap180(180) == 180
    assert wrap180(-180) == 180
    assert wrap180(190) == -170
    assert wrap180(-190) == 170
    assert wrap180(360) == 0
    assert wrap180(725) == 5


# ------------------------------------------------- northern hemisphere (home)


def test_magdeburg_azimuth_180_is_solar_noon():
    day = date(2026, 6, 21)
    az_at, _ = make_angle_funcs(MAGDEBURG.observer)
    start, end = day_window(MAGDEBURG, day)
    when = azimuth_crossing(az_at, start, end, 180.0)
    assert when is not None
    assert abs(when - solar_noon(MAGDEBURG, day)) < CLOSE


def test_magdeburg_elevation_30_rising_before_falling():
    day = date(2026, 6, 21)
    _, elev_at = make_angle_funcs(MAGDEBURG.observer)
    start, end = day_window(MAGDEBURG, day)
    rising = elevation_crossing(elev_at, start, end, 30.0, SUN_DIR_RISING)
    falling = elevation_crossing(elev_at, start, end, 30.0, SUN_DIR_FALLING)
    assert rising is not None and falling is not None
    assert rising < solar_noon(MAGDEBURG, day) < falling
    assert abs(elev_at(rising) - 30.0) < 0.1
    assert abs(elev_at(falling) - 30.0) < 0.1


def test_magdeburg_elevation_never_reached_in_winter():
    # Max elevation in Magdeburg on Dec 21 is ~14°; 40° is never reached.
    day = date(2026, 12, 21)
    _, elev_at = make_angle_funcs(MAGDEBURG.observer)
    start, end = day_window(MAGDEBURG, day)
    assert elevation_crossing(elev_at, start, end, 40.0, SUN_DIR_RISING) is None
    assert elevation_crossing(elev_at, start, end, 40.0, SUN_DIR_FALLING) is None


# --------------------------------------------- southern hemisphere (Sydney)


def test_sydney_sun_culminates_north_not_south():
    """In Sydney the sun stands due NORTH (0°) at solar noon, not south."""
    day = date(2026, 6, 21)  # southern winter
    az_at, _ = make_angle_funcs(SYDNEY.observer)
    start, end = day_window(SYDNEY, day)
    when = azimuth_crossing(az_at, start, end, 0.0)
    assert when is not None
    assert abs(when - solar_noon(SYDNEY, day)) < CLOSE


def test_sydney_azimuth_decreases_through_the_day():
    """Morning azimuth is east of north, afternoon west: travel is E→N→W."""
    day = date(2026, 6, 21)
    az_at, _ = make_angle_funcs(SYDNEY.observer)
    at_noon = solar_noon(SYDNEY, day)
    before = az_at(at_noon - timedelta(hours=2))
    after = az_at(at_noon + timedelta(hours=2))
    assert wrap180(before) > 0  # NE-ish
    assert wrap180(after) < 0  # NW-ish


def test_sydney_elevation_crossings_bracket_noon():
    day = date(2026, 1, 15)  # southern summer
    _, elev_at = make_angle_funcs(SYDNEY.observer)
    start, end = day_window(SYDNEY, day)
    rising = elevation_crossing(elev_at, start, end, 30.0, SUN_DIR_RISING)
    falling = elevation_crossing(elev_at, start, end, 30.0, SUN_DIR_FALLING)
    assert rising is not None and falling is not None
    assert rising < solar_noon(SYDNEY, day) < falling


# --------------------------------------------------------- tropics (Singapore)


def test_singapore_direction_flips_with_seasons():
    """December: sun culminates south (crosses 180°). June: north (crosses 0°)."""
    az_at, elev_at = make_angle_funcs(SINGAPORE.observer)

    december = date(2026, 12, 21)
    start, end = day_window(SINGAPORE, december)
    south = azimuth_crossing(az_at, start, end, 180.0, elev_at)
    assert south is not None
    assert abs(south - solar_noon(SINGAPORE, december)) < CLOSE

    june = date(2026, 6, 21)
    start, end = day_window(SINGAPORE, june)
    north = azimuth_crossing(az_at, start, end, 0.0, elev_at)
    assert north is not None
    assert abs(north - solar_noon(SINGAPORE, june)) < CLOSE


def test_singapore_night_crossing_is_ignored():
    """The raw azimuth sweep passes 180° at night too; the horizon filter
    must pick the visible noon crossing instead of the 1 a.m. one."""
    az_at, elev_at = make_angle_funcs(SINGAPORE.observer)
    day = date(2026, 12, 21)
    start, end = day_window(SINGAPORE, day)
    raw = azimuth_crossing(az_at, start, end, 180.0)
    filtered = azimuth_crossing(az_at, start, end, 180.0, elev_at)
    assert raw is not None and filtered is not None
    assert raw < filtered  # raw finds the below-horizon night crossing
    assert elev_at(filtered) > 0


def test_singapore_high_elevation_crossing():
    # Near the equator the sun passes 80° elevation around the equinox.
    day = date(2026, 3, 21)
    _, elev_at = make_angle_funcs(SINGAPORE.observer)
    start, end = day_window(SINGAPORE, day)
    rising = elevation_crossing(elev_at, start, end, 80.0, SUN_DIR_RISING)
    falling = elevation_crossing(elev_at, start, end, 80.0, SUN_DIR_FALLING)
    assert rising is not None and falling is not None
    assert rising < falling


# ------------------------------------------------------ polar region (Tromsø)


def test_tromso_polar_day_no_horizon_crossing():
    """Midnight sun: the sun never sets, so 0° is never crossed."""
    day = date(2026, 6, 21)
    _, elev_at = make_angle_funcs(TROMSO.observer)
    start, end = day_window(TROMSO, day)
    assert elevation_crossing(elev_at, start, end, 0.0, SUN_DIR_RISING) is None
    assert elevation_crossing(elev_at, start, end, 0.0, SUN_DIR_FALLING) is None


def test_tromso_polar_night_azimuth_still_resolves():
    """Polar night: no elevation crossing, but the azimuth sweep still works."""
    day = date(2026, 12, 21)
    az_at, elev_at = make_angle_funcs(TROMSO.observer)
    start, end = day_window(TROMSO, day)
    assert elevation_crossing(elev_at, start, end, 0.0, SUN_DIR_RISING) is None
    when = azimuth_crossing(az_at, start, end, 180.0)
    assert when is not None
    assert abs(when - solar_noon(TROMSO, day)) < CLOSE
    # With the horizon filter there is no visible crossing during polar night.
    assert azimuth_crossing(az_at, start, end, 180.0, elev_at) is None


def test_magdeburg_east_only_crossed_before_dawn_in_winter():
    """In deep winter 90° (east) is only swept below the horizon, so an
    east-facing azimuth trigger must not fire at all that day."""
    day = date(2026, 12, 21)
    az_at, elev_at = make_angle_funcs(MAGDEBURG.observer)
    start, end = day_window(MAGDEBURG, day)
    raw = azimuth_crossing(az_at, start, end, 90.0)
    assert raw is not None  # swept, but below horizon
    assert azimuth_crossing(az_at, start, end, 90.0, elev_at) is None


# --------------------------------------------------------------- solver edges


def test_azimuth_crossing_every_target_found_somewhere():
    """Over 24 h at temperate latitude every compass direction is crossed once."""
    day = date(2026, 4, 1)
    az_at, _ = make_angle_funcs(MAGDEBURG.observer)
    start, end = day_window(MAGDEBURG, day)
    for target in range(0, 360, 45):
        assert azimuth_crossing(az_at, start, end, float(target)) is not None


def test_crossing_precision_is_subminute():
    day = date(2026, 6, 21)
    az_at, _ = make_angle_funcs(MAGDEBURG.observer)
    start, end = day_window(MAGDEBURG, day)
    when = azimuth_crossing(az_at, start, end, 120.0)
    assert when is not None
    assert abs(wrap180(az_at(when) - 120.0)) < 0.05
