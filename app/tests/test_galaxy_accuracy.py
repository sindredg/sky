"""The galactic centre checked against the sun, which is a separate model."""

from datetime import UTC, datetime, timedelta

from app.src import galaxy, sun

ULURU = (-25.3444, 131.0369)


def _minute_of_extreme(when, latitude, longitude, altitude_of, pick):
    return pick(
        (altitude_of(when + timedelta(minutes=m), latitude, longitude), m)
        for m in range(0, 1440)
    )[1]


def test_the_core_culminates_near_solar_midnight_at_the_june_solstice():
    """An independent fact, and the reason core season peaks in June and July.

    The galactic centre sits at right ascension 17.76h. At the June solstice the
    sun is near 6h, so the anti-solar point is near 18h. The core therefore
    transits close to local solar midnight. Comparing the two uses the galaxy
    model against the solar model rather than against itself.
    """
    start = datetime(2026, 6, 21, tzinfo=UTC)
    core = _minute_of_extreme(start, *ULURU, galaxy.altitude, max)
    midnight = _minute_of_extreme(start, *ULURU, sun.altitude, min)

    assert abs(core - midnight) < 30


def test_peak_altitude_follows_the_declination_identity():
    """Highest possible altitude is 90 minus the angular distance in declination."""
    for latitude in (-54.8, -25.3, 0.0, 28.3, 51.3, 69.6):
        expected = 90.0 - abs(latitude - galaxy.DECLINATION_DEGREES)
        assert abs(galaxy.peak_altitude(latitude) - expected) < 0.001


def test_the_coordinate_is_sagittarius_a_star():
    # RA 17h45m40.04s, Dec -29d00m28.1s, J2000.
    assert abs(galaxy.RIGHT_ASCENSION_HOURS * 15.0 - 266.4168) < 0.01
    assert abs(galaxy.DECLINATION_DEGREES - -29.0078) < 0.001
