"""Solar position and the daylight events that follow from it."""

import math
from datetime import date, datetime, tzinfo

from . import sky

# Refraction plus the sun's apparent radius, so the event is the visible edge.
HORIZON = -0.833

GOLDEN_UPPER = 6.0
GOLDEN_LOWER = -4.0
BLUE_LOWER = -6.0

# Enough points to draw a smooth gradient without shipping 1440 numbers.
CURVE_STEP_MINUTES = 10


def altitude(when: datetime, latitude: float, longitude: float) -> float:
    """Altitude of the sun in degrees above the horizon."""
    n = sky.days_since_j2000(when)

    mean_longitude = (280.460 + 0.9856474 * n) % 360.0
    mean_anomaly = math.radians((357.528 + 0.9856003 * n) % 360.0)

    ecliptic_longitude = math.radians(
        mean_longitude
        + 1.915 * math.sin(mean_anomaly)
        + 0.020 * math.sin(2 * mean_anomaly)
    )
    obliquity = math.radians(23.439 - 0.0000004 * n)

    declination = math.asin(math.sin(obliquity) * math.sin(ecliptic_longitude))
    right_ascension = math.atan2(
        math.cos(obliquity) * math.sin(ecliptic_longitude),
        math.cos(ecliptic_longitude),
    )

    return sky.equatorial_to_altitude(
        when, right_ascension, declination, latitude, longitude
    )


def day_events(
    day: date, latitude: float, longitude: float, tz: str | float | tzinfo = 0.0
) -> dict:
    """Daylight events for one local day, including the polar cases."""
    zone = sky.as_timezone(tz)
    samples = sky.sample_day(day, lambda w: altitude(w, latitude, longitude), zone)

    highest = max(samples, key=lambda s: s.altitude)
    lowest = min(samples, key=lambda s: s.altitude)

    sunrise, sunset = sky.crossings(samples, HORIZON)
    golden_start, golden_end = sky.crossings(samples, GOLDEN_LOWER)
    _, blue_end = sky.crossings(samples, BLUE_LOWER)
    golden_top_rise, golden_top_set = sky.crossings(samples, GOLDEN_UPPER)

    def here(value):
        return sky.local(value, zone)

    return {
        "sunrise": here(sunrise),
        "sunset": here(sunset),
        "golden_hour_morning": (here(golden_start), here(golden_top_rise)),
        "golden_hour_evening": (here(golden_top_set), here(golden_end)),
        "blue_hour_morning": (here(blue_end), here(golden_start)),
        "highest": {"at": here(highest.at), "altitude": round(highest.altitude, 2)},
        "lowest": {"at": here(lowest.at), "altitude": round(lowest.altitude, 2)},
        "midnight_sun": lowest.altitude > HORIZON,
        "polar_night": highest.altitude < HORIZON,
        "daylight_minutes": sum(1 for s in samples[:-1] if s.altitude > HORIZON),
        "curve": [round(s.altitude, 2) for s in samples[::CURVE_STEP_MINUTES]],
        "curve_step_minutes": CURVE_STEP_MINUTES,
    }
