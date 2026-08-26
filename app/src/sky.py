"""Shared machinery for anything that rises and sets."""

import math
from collections.abc import Callable
from dataclasses import dataclass
from datetime import UTC, date, datetime, timedelta, timezone, tzinfo
from itertools import pairwise
from zoneinfo import ZoneInfo

_EPOCH = datetime(2000, 1, 1, 12, tzinfo=UTC)


def days_since_j2000(when: datetime) -> float:
    if when.tzinfo is None:
        raise ValueError("when must be timezone aware")
    return (when - _EPOCH).total_seconds() / 86400.0


def as_timezone(tz: str | float | tzinfo) -> tzinfo:
    """An IANA name, or a fixed offset in hours for a bare coordinate."""
    if isinstance(tz, str):
        return ZoneInfo(tz)
    if isinstance(tz, (int, float)):
        return timezone(timedelta(hours=tz))
    return tz


def equatorial_to_altitude(
    when: datetime,
    right_ascension: float,
    declination: float,
    latitude: float,
    longitude: float,
) -> float:
    """Altitude in degrees, from equatorial coordinates in radians."""
    n = days_since_j2000(when)
    greenwich = (18.697374558 + 24.06570982441908 * n) % 24.0
    local = math.radians((greenwich * 15.0 + longitude) % 360.0)
    hour_angle = local - right_ascension

    lat = math.radians(latitude)
    sin_alt = math.sin(lat) * math.sin(declination) + math.cos(lat) * math.cos(
        declination
    ) * math.cos(hour_angle)
    return math.degrees(math.asin(max(-1.0, min(1.0, sin_alt))))


@dataclass(frozen=True)
class Sample:
    at: datetime
    altitude: float


def sample_between(
    start: datetime,
    end: datetime,
    altitude_at: Callable[[datetime], float],
    step_minutes: int = 1,
) -> list[Sample]:
    """One altitude per step across an explicit span."""
    elapsed_minutes = int((end - start).total_seconds() // 60)
    steps = elapsed_minutes // step_minutes
    moments = (start + timedelta(minutes=m * step_minutes) for m in range(steps + 1))

    return [Sample(at, altitude_at(at)) for at in moments]


def sample_day(
    day: date,
    altitude_at: Callable[[datetime], float],
    tz: str | float | tzinfo = 0.0,
    step_minutes: int = 1,
) -> list[Sample]:
    """One altitude per step across the local day."""
    zone = as_timezone(tz)
    local_start = datetime(day.year, day.month, day.day, tzinfo=zone)
    tomorrow = day + timedelta(days=1)
    local_end = datetime(tomorrow.year, tomorrow.month, tomorrow.day, tzinfo=zone)

    return sample_between(
        local_start.astimezone(UTC),
        local_end.astimezone(UTC),
        altitude_at,
        step_minutes,
    )


def _interpolate(first: Sample, second: Sample, threshold: float) -> datetime:
    span = second.altitude - first.altitude
    if span == 0:
        return first.at
    return first.at + (second.at - first.at) * ((threshold - first.altitude) / span)


def crossings(
    samples: list[Sample], threshold: float
) -> tuple[datetime | None, datetime | None]:
    """First upward and last downward crossing, interpolated between samples."""
    rising = None
    falling = None

    for first, second in pairwise(samples):
        if first.altitude < threshold <= second.altitude and rising is None:
            rising = _interpolate(first, second, threshold)
        if first.altitude >= threshold > second.altitude:
            falling = _interpolate(first, second, threshold)

    return rising, falling


def local(value: datetime | None, zone: tzinfo) -> datetime | None:
    """Events are computed in UTC and reported where the observer stands."""
    return None if value is None else value.astimezone(zone)
