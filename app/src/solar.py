"""Solar position and the daylight events that follow from it."""

import math
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone, tzinfo
from zoneinfo import ZoneInfo

# Refraction plus the sun's apparent radius, so the event is the visible edge.
HORIZON = -0.833

GOLDEN_UPPER = 6.0
GOLDEN_LOWER = -4.0
BLUE_LOWER = -6.0

_J2000 = 2451545.0


def julian_day(when: datetime) -> float:
    """Days since the J2000.0 epoch."""
    if when.tzinfo is None:
        raise ValueError("when must be timezone aware")
    seconds = (when - datetime(2000, 1, 1, 12, tzinfo=timezone.utc)).total_seconds()
    return seconds / 86400.0


def solar_altitude(when: datetime, latitude: float, longitude: float) -> float:
    """Altitude of the sun in degrees above the horizon."""
    n = julian_day(when)

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

    greenwich_sidereal = (18.697374558 + 24.06570982441908 * n) % 24.0
    local_sidereal = math.radians((greenwich_sidereal * 15.0 + longitude) % 360.0)
    hour_angle = local_sidereal - right_ascension

    lat = math.radians(latitude)
    sin_altitude = math.sin(lat) * math.sin(declination) + math.cos(lat) * math.cos(
        declination
    ) * math.cos(hour_angle)

    return math.degrees(math.asin(max(-1.0, min(1.0, sin_altitude))))


@dataclass(frozen=True)
class Sample:
    at: datetime
    altitude: float


def as_timezone(tz: str | float | tzinfo) -> tzinfo:
    """An IANA name, or a fixed offset in hours for a bare coordinate."""
    if isinstance(tz, str):
        return ZoneInfo(tz)
    if isinstance(tz, (int, float)):
        return timezone(timedelta(hours=tz))
    return tz


def sample_day(
    day: date, latitude: float, longitude: float, tz: str | float | tzinfo = 0.0
) -> list[Sample]:
    """One altitude per minute across the local day."""
    zone = as_timezone(tz)
    start = datetime(day.year, day.month, day.day, tzinfo=zone).astimezone(timezone.utc)

    return [
        Sample(
            start + timedelta(minutes=m),
            solar_altitude(start + timedelta(minutes=m), latitude, longitude),
        )
        for m in range(1441)
    ]


def _crossings(samples: list[Sample], threshold: float) -> tuple[datetime | None, datetime | None]:
    """First upward and last downward crossing of a threshold, interpolated."""
    rising = None
    falling = None

    for first, second in zip(samples, samples[1:]):
        if first.altitude < threshold <= second.altitude and rising is None:
            rising = _interpolate(first, second, threshold)
        if first.altitude >= threshold > second.altitude:
            falling = _interpolate(first, second, threshold)

    return rising, falling


def _interpolate(first: Sample, second: Sample, threshold: float) -> datetime:
    span = second.altitude - first.altitude
    if span == 0:
        return first.at
    fraction = (threshold - first.altitude) / span
    return first.at + (second.at - first.at) * fraction


def _local(value: datetime | None, zone: tzinfo) -> datetime | None:
    """Events are computed in UTC and reported where the observer stands."""
    if value is None:
        return None
    return value.astimezone(zone)


def day_events(
    day: date, latitude: float, longitude: float, tz: str | float | tzinfo = 0.0
) -> dict:
    """Daylight events for one local day, including the polar cases."""
    zone = as_timezone(tz)
    samples = sample_day(day, latitude, longitude, zone)

    highest = max(samples, key=lambda s: s.altitude)
    lowest = min(samples, key=lambda s: s.altitude)

    sunrise, sunset = _crossings(samples, HORIZON)
    golden_start, golden_end = _crossings(samples, GOLDEN_LOWER)
    _, blue_end = _crossings(samples, BLUE_LOWER)
    golden_top_rise, golden_top_set = _crossings(samples, GOLDEN_UPPER)

    midnight_sun = lowest.altitude > HORIZON
    polar_night = highest.altitude < HORIZON

    daylight = sum(1 for s in samples[:-1] if s.altitude > HORIZON)

    def here(value):
        return _local(value, zone)

    return {
        "sunrise": here(sunrise),
        "sunset": here(sunset),
        "golden_hour_morning": (here(golden_start), here(golden_top_rise)),
        "golden_hour_evening": (here(golden_top_set), here(golden_end)),
        "blue_hour_morning": (here(blue_end), here(golden_start)),
        "highest": {"at": here(highest.at), "altitude": round(highest.altitude, 2)},
        "lowest": {"at": here(lowest.at), "altitude": round(lowest.altitude, 2)},
        "midnight_sun": midnight_sun,
        "polar_night": polar_night,
        "daylight_minutes": daylight,
    }
