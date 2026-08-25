"""Assertions against physical facts, not against our own output."""

from datetime import date

import pytest

from app.src import solar

EQUINOX = date(2026, 3, 20)
JUNE = date(2026, 6, 21)
DECEMBER = date(2026, 12, 21)

LOFOTEN = (67.9333, 13.0833)
TROMSO = (69.6492, 18.9553)
OSLO = (59.9139, 10.7522)
QUITO = (-0.1807, -78.4678)
SYDNEY = (-33.8688, 151.2093)


def test_equator_has_about_twelve_hours_at_equinox():
    events = solar.day_events(EQUINOX, *QUITO, utc_offset_hours=-5.0)
    assert 700 <= events["daylight_minutes"] <= 740


def test_lofoten_has_midnight_sun_in_june():
    events = solar.day_events(JUNE, *LOFOTEN, utc_offset_hours=2.0)
    assert events["midnight_sun"] is True
    assert events["polar_night"] is False
    assert events["lowest"]["altitude"] > solar.HORIZON


def test_tromso_has_polar_night_in_december():
    events = solar.day_events(DECEMBER, *TROMSO, utc_offset_hours=1.0)
    assert events["polar_night"] is True
    assert events["midnight_sun"] is False
    assert events["highest"]["altitude"] < solar.HORIZON


def test_polar_night_reports_no_sunrise_rather_than_crashing():
    events = solar.day_events(DECEMBER, *TROMSO, utc_offset_hours=1.0)
    assert events["sunrise"] is None
    assert events["sunset"] is None
    assert events["daylight_minutes"] == 0


def test_oslo_june_is_much_longer_than_oslo_december():
    summer = solar.day_events(JUNE, *OSLO, utc_offset_hours=2.0)
    winter = solar.day_events(DECEMBER, *OSLO, utc_offset_hours=1.0)
    assert summer["daylight_minutes"] > winter["daylight_minutes"] + 600


def test_southern_hemisphere_seasons_invert():
    june = solar.day_events(JUNE, *SYDNEY, utc_offset_hours=10.0)
    december = solar.day_events(DECEMBER, *SYDNEY, utc_offset_hours=11.0)
    assert december["daylight_minutes"] > june["daylight_minutes"]


def test_sun_is_higher_at_the_equator_than_in_oslo_at_equinox():
    equator = solar.day_events(EQUINOX, *QUITO, utc_offset_hours=-5.0)
    oslo = solar.day_events(EQUINOX, *OSLO, utc_offset_hours=1.0)
    assert equator["highest"]["altitude"] > oslo["highest"]["altitude"]


def test_altitude_requires_timezone_aware_input():
    from datetime import datetime

    with pytest.raises(ValueError):
        solar.solar_altitude(datetime(2026, 6, 21, 12), *OSLO)


def test_events_are_reported_in_local_time():
    """Santorini is UTC+3, so a UTC sunrise near 03:00 must read near 06:00."""
    events = solar.day_events(JUNE, 36.4618, 25.3753, utc_offset_hours=3.0)
    assert events["sunrise"].utcoffset().total_seconds() == 3 * 3600
    assert 5 <= events["sunrise"].hour <= 6
    assert 20 <= events["sunset"].hour <= 21


def test_local_noon_is_near_the_middle_of_the_day():
    events = solar.day_events(JUNE, *OSLO, utc_offset_hours=2.0)
    assert 12 <= events["highest"]["at"].hour <= 14
