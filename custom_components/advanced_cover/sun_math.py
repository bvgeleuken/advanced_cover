"""Pure sun-position crossing solver.

Resolves "sun crosses azimuth X" / "sun rises above / falls below elevation
Y" to a concrete datetime within a given day by sampling the sun's path and
bisecting the bracketing interval.

Deliberately assumption-free about the sun's direction of travel: on the
northern hemisphere the azimuth increases through the day, on the southern
hemisphere it decreases (E → N → W) and wraps through 0°/360° at local noon,
and in the tropics the direction can flip with the seasons. Sampling + sign
change detection handles all of these, including polar day/night (no
crossing → ``None``).

No Home Assistant imports: the module works on plain angle callables so it
can be tested without a running core. :func:`make_angle_funcs` adapts an
astral observer (astral is a Home Assistant core dependency).
"""

from __future__ import annotations

from collections.abc import Callable
from datetime import datetime, timedelta
from typing import Any

from astral import sun as astral_sun

from .const import SUN_DIR_RISING

# Sampling step across the day. The sun's azimuth moves < 0.5°/min except
# during a (near-)zenith passage, which is excluded on purpose (see
# _is_genuine_crossing); elevation moves < 0.3°/min everywhere.
_SAMPLE_STEP = timedelta(minutes=2)
# Bisection stops when the bracket is this small.
_PRECISION = timedelta(seconds=1)
# "Sun is up" bound for azimuth crossings: upper limb on the horizon,
# matching the usual sunrise/sunset definition (refraction included).
_HORIZON_ELEVATION = -0.833

AngleAt = Callable[[datetime], float]


def wrap180(deg: float) -> float:
    """Wrap an angle difference into (-180, 180]."""
    return -((-deg + 180.0) % 360.0 - 180.0)


def make_angle_funcs(observer: Any) -> tuple[AngleAt, AngleAt]:
    """Return (azimuth_at, elevation_at) callables for an astral observer."""

    def _azimuth(when: datetime) -> float:
        return astral_sun.azimuth(observer, when)

    def _elevation(when: datetime) -> float:
        return astral_sun.elevation(observer, when)

    return _azimuth, _elevation


def _is_genuine_crossing(d0: float, d1: float) -> bool:
    """Whether a sign change of wrapped differences is a real zero crossing.

    Excludes the antipodal ±180° wrap (values jump between ~+180 and ~-180)
    and near-instant zenith flips (~180° jumps): in both cases the sun never
    actually sweeps through the target angle.
    """
    return (d0 > 0) != (d1 > 0) and abs(d1 - d0) < 180.0


def _bisect(
    f: Callable[[datetime], float], t0: datetime, t1: datetime, positive_at_t1: bool
) -> datetime:
    """Narrow a bracketing interval down to :data:`_PRECISION`."""
    while t1 - t0 > _PRECISION:
        mid = t0 + (t1 - t0) / 2
        if (f(mid) > 0) == positive_at_t1:
            t1 = mid
        else:
            t0 = mid
    return t0 + (t1 - t0) / 2


def azimuth_crossing(
    azimuth_at: AngleAt,
    start: datetime,
    end: datetime,
    target_deg: float,
    elevation_at: AngleAt | None = None,
) -> datetime | None:
    """First time in [start, end) the sun's azimuth crosses ``target_deg``.

    With ``elevation_at`` given, only crossings while the sun is above the
    horizon count. That is the useful trigger semantic: in the tropics the
    azimuth can sweep through a target several times per day (e.g. through
    south again at night), and at higher latitudes easterly/westerly targets
    may only be crossed before dawn or after dusk — none of which should
    move a cover. Returns ``None`` when there is no (visible) crossing.
    """

    def diff(when: datetime) -> float:
        return wrap180(azimuth_at(when) - target_deg)

    def accepted(when: datetime) -> bool:
        return elevation_at is None or elevation_at(when) >= _HORIZON_ELEVATION

    t0 = start
    d0 = diff(t0)
    if d0 == 0.0 and accepted(t0):
        return t0
    while t0 < end:
        t1 = min(t0 + _SAMPLE_STEP, end)
        d1 = diff(t1)
        if d1 == 0.0:
            if accepted(t1):
                return t1
        elif _is_genuine_crossing(d0, d1):
            when = _bisect(diff, t0, t1, positive_at_t1=d1 > 0)
            if accepted(when):
                return when
        t0, d0 = t1, d1
    return None


def elevation_crossing(
    elevation_at: AngleAt,
    start: datetime,
    end: datetime,
    threshold_deg: float,
    direction: str,
) -> datetime | None:
    """First time in [start, end) the elevation crosses ``threshold_deg``.

    ``direction`` picks the rising (below → above) or falling (above →
    below) crossing. Returns ``None`` when the threshold is never crossed
    that way (e.g. polar day/night, or a threshold above the day's maximum).
    """
    rising = direction == SUN_DIR_RISING

    def diff(when: datetime) -> float:
        return elevation_at(when) - threshold_deg

    t0 = start
    d0 = diff(t0)
    while t0 < end:
        t1 = min(t0 + _SAMPLE_STEP, end)
        d1 = diff(t1)
        matches = (d0 < 0 <= d1) if rising else (d0 > 0 >= d1)
        if matches:
            if d1 == 0.0:
                return t1
            return _bisect(diff, t0, t1, positive_at_t1=d1 > 0)
        t0, d0 = t1, d1
    return None
