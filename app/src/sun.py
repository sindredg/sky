"""Solar position and the daylight events that follow from it.

The coordinate model follows the US Naval Observatory's approximate solar
coordinates: https://aa.usno.navy.mil/faq/sun_approx
"""

import math
from datetime import date, datetime, timedelta, tzinfo

from . import sky

# Refraction plus the sun's apparent radius, so the event is the visible edge.
HORIZON = -0.833

GOLDEN_UPPER = 6.0
GOLDEN_LOWER = -4.0
BLUE_LOWER = -6.0

# Enough points to draw a smooth gradient without shipping 1440 numbers.
CURVE_STEP_MINUTES = 10
SEASON_STEP_MINUTES = 5


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


def _minutes_between(start: datetime | None, end: datetime | None) -> int:
    if start is None or end is None:
        return 0
    return round((end - start).total_seconds() / 60)


def _events_from_samples(
    samples: list[sky.Sample],
    zone: tzinfo,
    curve_step_minutes: int | None = None,
) -> dict:
    highest = max(samples, key=lambda s: s.altitude)
    lowest = min(samples, key=lambda s: s.altitude)

    sunrise, sunset = sky.crossings(samples, HORIZON)
    golden_start, golden_end = sky.crossings(samples, GOLDEN_LOWER)
    _, blue_end = sky.crossings(samples, BLUE_LOWER)
    golden_top_rise, golden_top_set = sky.crossings(samples, GOLDEN_UPPER)

    def here(value):
        return sky.local(value, zone)

    midnight_sun = lowest.altitude > HORIZON
    polar_night = highest.altitude < HORIZON

    if midnight_sun:
        daylight_minutes = 24 * 60
    elif polar_night:
        daylight_minutes = 0
    else:
        daylight_minutes = _minutes_between(sunrise, sunset)

    events = {
        "sunrise": here(sunrise),
        "sunset": here(sunset),
        "golden_hour_morning": (here(golden_start), here(golden_top_rise)),
        "golden_hour_evening": (here(golden_top_set), here(golden_end)),
        "blue_hour_morning": (here(blue_end), here(golden_start)),
        "highest": {"at": here(highest.at), "altitude": round(highest.altitude, 2)},
        "lowest": {"at": here(lowest.at), "altitude": round(lowest.altitude, 2)},
        "midnight_sun": midnight_sun,
        "polar_night": polar_night,
        "daylight_minutes": daylight_minutes,
    }

    if curve_step_minutes is not None:
        events["curve"] = [round(s.altitude, 2) for s in samples[::curve_step_minutes]]
        events["curve_step_minutes"] = curve_step_minutes

    return events


def day_events(
    day: date, latitude: float, longitude: float, tz: str | float | tzinfo = 0.0
) -> dict:
    """Daylight events for one local day, including the polar cases."""
    zone = sky.as_timezone(tz)
    samples = sky.sample_day(day, lambda w: altitude(w, latitude, longitude), zone)
    return _events_from_samples(samples, zone, curve_step_minutes=CURVE_STEP_MINUTES)


def _ranges(series: list[dict], key: str) -> list[dict]:
    spans = []
    start = None

    for row in series:
        if row[key]:
            start = row["date"] if start is None else start
            end = row["date"]
            continue

        if start is not None:
            spans.append({"start": start, "end": end, "days": (end - start).days + 1})
            start = None

    if start is not None:
        spans.append({"start": start, "end": end, "days": (end - start).days + 1})

    return spans


def season(
    from_day: date,
    days: int,
    latitude: float,
    longitude: float,
    tz: str | float | tzinfo = 0.0,
) -> dict:
    """Daylight changes across a run of local days."""
    if not 1 <= days <= 366:
        raise ValueError("days must be between 1 and 366")

    zone = sky.as_timezone(tz)
    series = []

    for offset in range(days):
        day = from_day + timedelta(days=offset)
        samples = sky.sample_day(
            day,
            lambda when: altitude(when, latitude, longitude),
            zone,
            step_minutes=SEASON_STEP_MINUTES,
        )
        events = _events_from_samples(samples, zone)
        series.append(
            {
                "date": day,
                "sunrise": events["sunrise"],
                "sunset": events["sunset"],
                "daylight_minutes": events["daylight_minutes"],
                "golden_hour_evening": events["golden_hour_evening"],
                "midnight_sun": events["midnight_sun"],
                "polar_night": events["polar_night"],
            }
        )

    longest_day = max(series, key=lambda row: row["daylight_minutes"])
    shortest_day = min(series, key=lambda row: row["daylight_minutes"])

    return {
        "from": from_day,
        "days": days,
        "step_minutes": SEASON_STEP_MINUTES,
        "series": series,
        "summary": {
            "longest_day": {
                "date": longest_day["date"],
                "daylight_minutes": longest_day["daylight_minutes"],
            },
            "shortest_day": {
                "date": shortest_day["date"],
                "daylight_minutes": shortest_day["daylight_minutes"],
            },
            "midnight_sun_ranges": _ranges(series, "midnight_sun"),
            "polar_night_ranges": _ranges(series, "polar_night"),
        },
    }
