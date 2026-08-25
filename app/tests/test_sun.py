"""Assertions against physical facts, not against our own output."""

from datetime import date

import pytest

from app.src import sun

EQUINOX = date(2026, 3, 20)
JUNE = date(2026, 6, 21)
DECEMBER = date(2026, 12, 21)

LOFOTEN = (67.9333, 13.0833)
TROMSO = (69.6492, 18.9553)
OSLO = (59.9139, 10.7522)
QUITO = (-0.1807, -78.4678)
SYDNEY = (-33.8688, 151.2093)


def test_equator_has_about_twelve_hours_at_equinox():
    events = sun.day_events(EQUINOX, *QUITO, tz=-5.0)
    assert 700 <= events["daylight_minutes"] <= 740


def test_lofoten_has_midnight_sun_in_june():
    events = sun.day_events(JUNE, *LOFOTEN, tz=2.0)
    assert events["midnight_sun"] is True
    assert events["polar_night"] is False
    assert events["lowest"]["altitude"] > sun.HORIZON


def test_tromso_has_polar_night_in_december():
    events = sun.day_events(DECEMBER, *TROMSO, tz=1.0)
    assert events["polar_night"] is True
    assert events["midnight_sun"] is False
    assert events["highest"]["altitude"] < sun.HORIZON


def test_polar_night_reports_no_sunrise_rather_than_crashing():
    events = sun.day_events(DECEMBER, *TROMSO, tz=1.0)
    assert events["sunrise"] is None
    assert events["sunset"] is None
    assert events["daylight_minutes"] == 0


def test_oslo_june_is_much_longer_than_oslo_december():
    summer = sun.day_events(JUNE, *OSLO, tz=2.0)
    winter = sun.day_events(DECEMBER, *OSLO, tz=1.0)
    assert summer["daylight_minutes"] > winter["daylight_minutes"] + 600


def test_southern_hemisphere_seasons_invert():
    june = sun.day_events(JUNE, *SYDNEY, tz=10.0)
    december = sun.day_events(DECEMBER, *SYDNEY, tz=11.0)
    assert december["daylight_minutes"] > june["daylight_minutes"]


def test_sun_is_higher_at_the_equator_than_in_oslo_at_equinox():
    equator = sun.day_events(EQUINOX, *QUITO, tz=-5.0)
    oslo = sun.day_events(EQUINOX, *OSLO, tz=1.0)
    assert equator["highest"]["altitude"] > oslo["highest"]["altitude"]


def test_altitude_requires_timezone_aware_input():
    from datetime import datetime

    with pytest.raises(ValueError):
        sun.altitude(datetime(2026, 6, 21, 12), *OSLO)


def test_events_are_reported_in_local_time():
    """Santorini is UTC+3 in June, so a UTC sunrise near 03:00 must read near 06:00."""
    events = sun.day_events(JUNE, 36.4618, 25.3753, tz="Europe/Athens")
    assert events["sunrise"].utcoffset().total_seconds() == 3 * 3600
    assert 5 <= events["sunrise"].hour <= 6
    assert 20 <= events["sunset"].hour <= 21


def test_local_noon_is_near_the_middle_of_the_day():
    events = sun.day_events(JUNE, *OSLO, tz=2.0)
    assert 12 <= events["highest"]["at"].hour <= 14


def test_named_zones_follow_daylight_saving():
    """A fixed offset cannot do this, which is why places carry IANA names."""
    summer = sun.day_events(JUNE, *OSLO, tz="Europe/Oslo")
    winter = sun.day_events(DECEMBER, *OSLO, tz="Europe/Oslo")
    assert summer["sunrise"].utcoffset().total_seconds() == 2 * 3600
    assert winter["sunrise"].utcoffset().total_seconds() == 1 * 3600


def test_southern_daylight_saving_also_inverts():
    """Santiago is UTC-4 in June and UTC-3 in December."""
    june = sun.day_events(JUNE, -50.9423, -73.4068, tz="America/Santiago")
    december = sun.day_events(DECEMBER, -50.9423, -73.4068, tz="America/Santiago")
    assert june["sunrise"].utcoffset().total_seconds() == -4 * 3600
    assert december["sunrise"].utcoffset().total_seconds() == -3 * 3600


def test_deliberately_failing():
    assert False
