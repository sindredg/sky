"""Lunar position, phase, and when an eclipse is possible.

Positions follow the standard low precision lunar theory with its main
perturbation terms, which is accurate to a few arcminutes. That is well inside
the error a one minute sampling step already introduces into rise and set times.
"""

import math
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone, tzinfo

from . import sky

# Refraction at the horizon. Parallax is removed before this is applied.
HORIZON = -0.583

SYNODIC_MONTH = 29.530588

# A syzygy this close to a node puts the three bodies near enough to align.
SOLAR_ECLIPSE_LATITUDE = 1.4
LUNAR_ECLIPSE_LATITUDE = 1.0

PHASE_NAMES = (
    (0, "new moon"),
    (45, "waxing crescent"),
    (90, "first quarter"),
    (135, "waxing gibbous"),
    (180, "full moon"),
    (225, "waning gibbous"),
    (270, "last quarter"),
    (315, "waning crescent"),
)


def _norm(degrees: float) -> float:
    return degrees % 360.0


def _kepler(mean_anomaly: float, eccentricity: float) -> float:
    e = mean_anomaly + eccentricity * math.sin(mean_anomaly) * (
        1.0 + eccentricity * math.cos(mean_anomaly)
    )
    for _ in range(8):
        delta = (e - eccentricity * math.sin(e) - mean_anomaly) / (
            1.0 - eccentricity * math.cos(e)
        )
        e -= delta
        if abs(delta) < 1e-10:
            break
    return e


def sun_longitude(when: datetime) -> float:
    """Ecliptic longitude of the sun in degrees."""
    d = sky.days_since_j2000(when) + 1.5
    perihelion = 282.9404 + 4.70935e-5 * d
    eccentricity = 0.016709 - 1.151e-9 * d
    mean_anomaly = math.radians(_norm(356.0470 + 0.9856002585 * d))

    e = _kepler(mean_anomaly, eccentricity)
    x = math.cos(e) - eccentricity
    y = math.sqrt(1 - eccentricity**2) * math.sin(e)
    true_anomaly = math.degrees(math.atan2(y, x))

    return _norm(true_anomaly + perihelion)


@dataclass(frozen=True)
class Position:
    longitude: float
    latitude: float
    distance: float
    right_ascension: float
    declination: float


def position(when: datetime) -> Position:
    """Geocentric ecliptic and equatorial coordinates of the moon."""
    d = sky.days_since_j2000(when) + 1.5

    node = _norm(125.1228 - 0.0529538083 * d)
    inclination = 5.1454
    perigee = _norm(318.0634 + 0.1643573223 * d)
    axis = 60.2666
    eccentricity = 0.054900
    mean_anomaly = _norm(115.3654 + 13.0649929509 * d)

    e = _kepler(math.radians(mean_anomaly), eccentricity)
    xv = axis * (math.cos(e) - eccentricity)
    yv = axis * math.sqrt(1 - eccentricity**2) * math.sin(e)
    distance = math.hypot(xv, yv)
    true_anomaly = math.degrees(math.atan2(yv, xv))

    n = math.radians(node)
    vw = math.radians(true_anomaly + perigee)
    i = math.radians(inclination)

    xh = distance * (math.cos(n) * math.cos(vw) - math.sin(n) * math.sin(vw) * math.cos(i))
    yh = distance * (math.sin(n) * math.cos(vw) + math.cos(n) * math.sin(vw) * math.cos(i))
    zh = distance * math.sin(vw) * math.sin(i)

    longitude = _norm(math.degrees(math.atan2(yh, xh)))
    latitude = math.degrees(math.atan2(zh, math.hypot(xh, yh)))

    solar_anomaly = _norm(356.0470 + 0.9856002585 * d)
    solar_perihelion = 282.9404 + 4.70935e-5 * d
    solar_longitude = _norm(solar_anomaly + solar_perihelion)
    moon_longitude = _norm(mean_anomaly + perigee + node)
    elongation = _norm(moon_longitude - solar_longitude)
    argument_latitude = _norm(moon_longitude - node)

    ms = math.radians(solar_anomaly)
    mm = math.radians(mean_anomaly)
    dd = math.radians(elongation)
    ff = math.radians(argument_latitude)

    longitude += (
        -1.274 * math.sin(mm - 2 * dd)
        + 0.658 * math.sin(2 * dd)
        - 0.186 * math.sin(ms)
        - 0.059 * math.sin(2 * mm - 2 * dd)
        - 0.057 * math.sin(mm - 2 * dd + ms)
        + 0.053 * math.sin(mm + 2 * dd)
        + 0.046 * math.sin(2 * dd - ms)
        + 0.041 * math.sin(mm - ms)
        - 0.035 * math.sin(dd)
        - 0.031 * math.sin(mm + ms)
        - 0.015 * math.sin(2 * ff - 2 * dd)
        + 0.011 * math.sin(mm - 4 * dd)
    )
    latitude += (
        -0.173 * math.sin(ff - 2 * dd)
        - 0.055 * math.sin(mm - ff - 2 * dd)
        - 0.046 * math.sin(mm + ff - 2 * dd)
        + 0.033 * math.sin(ff + 2 * dd)
        + 0.017 * math.sin(2 * mm + ff)
    )
    distance += -0.58 * math.cos(mm - 2 * dd) - 0.46 * math.cos(2 * dd)

    longitude = _norm(longitude)

    obliquity = math.radians(23.4393 - 3.563e-7 * d)
    lon = math.radians(longitude)
    lat = math.radians(latitude)

    x = math.cos(lon) * math.cos(lat)
    y = math.sin(lon) * math.cos(lat)
    z = math.sin(lat)

    ye = y * math.cos(obliquity) - z * math.sin(obliquity)
    ze = y * math.sin(obliquity) + z * math.cos(obliquity)

    return Position(
        longitude=longitude,
        latitude=latitude,
        distance=distance,
        right_ascension=math.atan2(ye, x),
        declination=math.atan2(ze, math.hypot(x, ye)),
    )


def altitude(when: datetime, latitude: float, longitude: float) -> float:
    """Topocentric altitude. Lunar parallax is close to a degree, so it matters."""
    p = position(when)
    geocentric = sky.equatorial_to_altitude(
        when, p.right_ascension, p.declination, latitude, longitude
    )
    parallax = math.degrees(math.asin(1.0 / p.distance))
    return geocentric - parallax * math.cos(math.radians(geocentric))


def elongation(when: datetime) -> float:
    """Angular distance from the sun along the ecliptic, 0 at new, 180 at full."""
    return _norm(position(when).longitude - sun_longitude(when))


def illumination(when: datetime) -> float:
    """Fraction of the visible disc that is lit."""
    return (1.0 - math.cos(math.radians(elongation(when)))) / 2.0


def phase_name(angle: float) -> str:
    for boundary, name in reversed(PHASE_NAMES):
        if angle >= boundary - 22.5:
            return name
    return "new moon"


def day_events(
    day: date, latitude: float, longitude: float, tz: str | float | tzinfo = 0.0
) -> dict:
    """Moonrise, moonset, and the phase at local noon."""
    zone = sky.as_timezone(tz)
    samples = sky.sample_day(day, lambda w: altitude(w, latitude, longitude), zone)

    rise, set_ = sky.crossings(samples, HORIZON)
    highest = max(samples, key=lambda s: s.altitude)

    noon = datetime(day.year, day.month, day.day, 12, tzinfo=zone).astimezone(
        timezone.utc
    )
    angle = elongation(noon)

    return {
        "moonrise": sky.local(rise, zone),
        "moonset": sky.local(set_, zone),
        "highest": {
            "at": sky.local(highest.at, zone),
            "altitude": round(highest.altitude, 2),
        },
        "always_up": min(s.altitude for s in samples) > HORIZON,
        "never_up": highest.altitude < HORIZON,
        "phase": phase_name(angle),
        "phase_angle": round(angle, 1),
        "illumination": round(illumination(noon), 3),
        "age_days": round(angle / 360.0 * SYNODIC_MONTH, 1),
    }


def _syzygies(start: date, days: int, target: float) -> list[datetime]:
    """Times when elongation passes through a target, scanning hour by hour."""
    when = datetime(start.year, start.month, start.day, tzinfo=timezone.utc)
    found = []

    previous = None
    for hour in range(days * 24 + 1):
        moment = when + timedelta(hours=hour)
        offset = (elongation(moment) - target + 180.0) % 360.0 - 180.0
        if previous is not None and previous < 0 <= offset:
            found.append(moment)
        previous = offset

    return found


def eclipse_seasons(start: date, days: int = 400) -> list[dict]:
    """Syzygies close enough to a node that an eclipse happens somewhere.

    Circumstances, path and local visibility need full ephemerides and are out
    of scope. This answers whether an eclipse occurs at all, and of what kind.
    """
    events = []

    for moment in _syzygies(start, days, 0.0):
        latitude = abs(position(moment).latitude)
        if latitude < SOLAR_ECLIPSE_LATITUDE:
            events.append(
                {
                    "at": moment,
                    "kind": "solar",
                    "moon_latitude": round(latitude, 2),
                }
            )

    for moment in _syzygies(start, days, 180.0):
        latitude = abs(position(moment).latitude)
        if latitude < LUNAR_ECLIPSE_LATITUDE:
            events.append(
                {
                    "at": moment,
                    "kind": "lunar",
                    "moon_latitude": round(latitude, 2),
                }
            )

    return sorted(events, key=lambda e: e["at"])
