"""The galactic centre. A fixed point, so there is no orbital mechanics here."""

import math
from datetime import UTC, date, datetime, timedelta, tzinfo

from . import moon, sky, sun

# Sagittarius A*, J2000. The centre of the Milky Way does not move.
RIGHT_ASCENSION_HOURS = 17 + 45 / 60 + 40.04 / 3600
DECLINATION_DEGREES = -(29 + 28.1 / 3600)

_RIGHT_ASCENSION = math.radians(RIGHT_ASCENSION_HOURS * 15.0)
_DECLINATION = math.radians(DECLINATION_DEGREES)

# Below ten degrees the core sits behind roughly five air masses.
USABLE_ALTITUDE = 10.0

# Astronomical twilight, the same threshold the light bar already draws.
DARK_ENOUGH = -18.0

# A gibbous moon above the horizon brightens the sky past the core itself.
MOON_WASHES_OUT = 0.4


def altitude(when: datetime, latitude: float, longitude: float) -> float:
    return sky.equatorial_to_altitude(
        when, _RIGHT_ASCENSION, _DECLINATION, latitude, longitude
    )


def peak_altitude(latitude: float) -> float:
    """The most the core can ever reach here, whatever the date."""
    return 90.0 - abs(latitude - DECLINATION_DEGREES)


def _longest_run(flags: list[bool]) -> tuple[int, int] | None:
    best = None
    best_length = 0
    start = None

    for index, ok in enumerate(flags + [False]):
        if ok and start is None:
            start = index
        elif not ok and start is not None:
            if index - start > best_length:
                best_length, best = index - start, (start, index - 1)
            start = None

    return best


def core_window(
    day: date,
    latitude: float,
    longitude: float,
    tz: str | float | tzinfo = 0.0,
    step_minutes: int = 5,
) -> dict:
    """When the core is high enough, in dark enough sky, on the night of `day`."""
    zone = sky.as_timezone(tz)

    # Noon to noon, so the night sits in the middle instead of split across
    # both ends of a calendar day.
    start = datetime(day.year, day.month, day.day, 12, tzinfo=zone).astimezone(UTC)
    end = start + timedelta(hours=24)

    core = sky.sample_between(
        start, end, lambda w: altitude(w, latitude, longitude), step_minutes
    )
    midnight = start + timedelta(hours=12)
    lit = moon.illumination(midnight)

    result = {
        "peak_altitude": round(max(s.altitude for s in core), 1),
        "window": None,
        "reason": None,
        "moon": {"illumination": round(lit, 3), "above_horizon": False},
    }

    if result["peak_altitude"] <= 0:
        result["reason"] = "never_rises"
        return result

    if result["peak_altitude"] < USABLE_ALTITUDE:
        result["reason"] = "too_low"
        return result

    dark = [sun.altitude(s.at, latitude, longitude) <= DARK_ENOUGH for s in core]
    if not any(dark):
        result["reason"] = "no_astronomical_darkness"
        return result

    run = _longest_run(
        [s.altitude >= USABLE_ALTITUDE and d for s, d in zip(core, dark, strict=True)]
    )
    if run is None:
        result["reason"] = "no_astronomical_darkness"
        return result

    first, last = run
    result["window"] = {
        "start": sky.local(core[first].at, zone),
        "end": sky.local(core[last].at, zone),
    }

    during = core[first : last + 1]
    up = sum(1 for s in during if moon.altitude(s.at, latitude, longitude) > 0)
    result["moon"]["above_horizon"] = up > len(during) / 2

    # The window is still reported when the moon spoils it, because knowing
    # when it would have been is the useful part.
    if lit >= MOON_WASHES_OUT and result["moon"]["above_horizon"]:
        result["reason"] = "moon_washes_it_out"

    return result
