"""Assertions against facts that hold regardless of our implementation."""

from datetime import UTC, date, datetime, timedelta

import pytest

from app.src import moon

OSLO = (59.9139, 10.7522)

# Eclipses are published decades ahead, so these are independent of our code.
KNOWN_2026 = {
    (date(2026, 2, 17), "solar"),
    (date(2026, 3, 3), "lunar"),
    (date(2026, 8, 12), "solar"),
    (date(2026, 8, 28), "lunar"),
}

# NASA JPL Horizons DE441, geocentric apparent ecliptic-of-date coordinates.
# Query: https://ssd.jpl.nasa.gov/horizons/
JPL_HORIZONS_2026 = (
    (datetime(2026, 1, 1, tzinfo=UTC), 66.7156363, 5.0490966),
    (datetime(2026, 3, 20, 12, tzinfo=UTC), 18.8639882, 3.3691379),
    (datetime(2026, 6, 21, tzinfo=UTC), 168.6969009, -1.4722116),
    (datetime(2026, 9, 22, 12, tzinfo=UTC), 309.5153172, -1.7968138),
    (datetime(2026, 12, 21, tzinfo=UTC), 46.2659775, 5.0835702),
)


def angular_difference(first: float, second: float) -> float:
    return abs((first - second + 180.0) % 360.0 - 180.0)


@pytest.mark.parametrize(("when", "longitude", "latitude"), JPL_HORIZONS_2026)
def test_lunar_position_is_within_three_arcminutes_of_jpl_horizons(
    when, longitude, latitude
):
    found = moon.position(when)

    assert angular_difference(found.longitude, longitude) <= 0.05
    assert abs(found.latitude - latitude) <= 0.05


def test_illumination_is_zero_at_new_moon():
    for new in moon._syzygies(date(2026, 1, 1), 120, 0.0):
        assert moon.illumination(new) < 0.001


def test_illumination_is_one_at_full_moon():
    for full in moon._syzygies(date(2026, 1, 1), 120, 180.0):
        assert moon.illumination(full) > 0.999


def test_synodic_month_is_about_twentynine_and_a_half_days():
    news = moon._syzygies(date(2026, 1, 1), 200, 0.0)
    gaps = [(b - a).total_seconds() / 86400 for a, b in zip(news, news[1:])]
    assert gaps, "expected several new moons in 200 days"
    for gap in gaps:
        assert 29.0 <= gap <= 30.1
    assert 29.2 <= sum(gaps) / len(gaps) <= 29.9


def test_illumination_always_between_zero_and_one():
    when = datetime(2026, 1, 1, tzinfo=UTC)
    for hours in range(0, 24 * 40, 7):
        value = moon.illumination(when + timedelta(hours=hours))
        assert 0.0 <= value <= 1.0


def test_moon_rises_roughly_fifty_minutes_later_each_day():
    """The moon loses about 12 degrees a day against the stars."""
    deltas = []
    previous = None
    for offset in range(6):
        events = moon.day_events(
            date(2026, 5, 4) + timedelta(days=offset), *OSLO, tz="Europe/Oslo"
        )
        rise = events["moonrise"]
        if rise and previous:
            minutes = (rise - previous).total_seconds() / 60 % 1440
            deltas.append(minutes)
        previous = rise
    assert deltas, "expected consecutive moonrises"
    assert 20 <= sum(deltas) / len(deltas) <= 90


def test_known_2026_eclipses_are_found():
    found = {
        (e["at"].date(), e["kind"]) for e in moon.eclipse_seasons(date(2026, 1, 1), 365)
    }
    assert found >= KNOWN_2026


def test_no_eclipses_are_invented():
    """Every detection must be a real one, not merely every real one detected."""
    found = {
        (e["at"].date(), e["kind"]) for e in moon.eclipse_seasons(date(2026, 1, 1), 365)
    }
    assert found <= KNOWN_2026


def test_eclipses_occur_near_a_node():
    for event in moon.eclipse_seasons(date(2026, 1, 1), 365):
        assert event["moon_latitude"] < moon.SOLAR_ECLIPSE_LATITUDE


def test_phase_names_cover_the_cycle():
    assert moon.phase_name(0) == "new moon"
    assert moon.phase_name(180) == "full moon"
    assert moon.phase_name(90) == "first quarter"
    assert moon.phase_name(270) == "last quarter"
