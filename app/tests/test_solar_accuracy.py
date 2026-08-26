"""Solar altitude against NASA JPL Horizons, and against arithmetic that cannot lie.

Every other solar test asserts an invariant: an equinox is about twelve hours,
summer beats winter, hemispheres invert. All of those hold for a model that is
systematically wrong. Injecting a one degree error into solar longitude passes
all twelve of them while moving sunrise two and a half minutes.

These compare against something outside the implementation.
"""

from datetime import UTC, date, datetime

import pytest

from app.src import sun
from app.src.places import PLACES

# NASA JPL Horizons, DE441, geocentric site, airless, apparent elevation.
# Query: https://ssd.jpl.nasa.gov/api/horizons.api
#   COMMAND='10' CENTER='coord@399' COORD_TYPE='GEODETIC'
#   SITE_COORD='<east lon>,<lat>,0' QUANTITIES='4'
HORIZONS = (
    # Santorini, northern midsummer.
    (36.4618, 25.3753, datetime(2026, 6, 21, 0, tzinfo=UTC), -25.639024),
    (36.4618, 25.3753, datetime(2026, 6, 21, 6, tzinfo=UTC), 33.191370),
    (36.4618, 25.3753, datetime(2026, 6, 21, 12, tzinfo=UTC), 64.899143),
    (36.4618, 25.3753, datetime(2026, 6, 21, 18, tzinfo=UTC), -4.268790),
    # Tromso, polar night. Every elevation is below the horizon.
    (69.6492, 18.9553, datetime(2026, 12, 21, 0, tzinfo=UTC), -42.351482),
    (69.6492, 18.9553, datetime(2026, 12, 21, 6, tzinfo=UTC), -15.461064),
    (69.6492, 18.9553, datetime(2026, 12, 21, 12, tzinfo=UTC), -4.132799),
    (69.6492, 18.9553, datetime(2026, 12, 21, 18, tzinfo=UTC), -28.618864),
    # Uluru, southern hemisphere, equinox.
    (-25.3444, 131.0369, datetime(2026, 3, 20, 0, tzinfo=UTC), 34.908139),
    (-25.3444, 131.0369, datetime(2026, 3, 20, 6, tzinfo=UTC), 44.572719),
    (-25.3444, 131.0369, datetime(2026, 3, 20, 12, tzinfo=UTC), -34.793354),
)

# Observed worst case is 0.41 arcminutes. One arcminute leaves room for the
# geocentric approximation without admitting a real error: the one degree
# mutation above would miss this by a factor of sixty.
TOLERANCE_DEGREES = 1.0 / 60.0


@pytest.mark.parametrize(("latitude", "longitude", "when", "elevation"), HORIZONS)
def test_solar_altitude_matches_jpl_horizons(latitude, longitude, when, elevation):
    assert abs(sun.altitude(when, latitude, longitude) - elevation) <= TOLERANCE_DEGREES


def test_solar_noon_lands_near_midday_at_every_place():
    """Catches a timezone that does not belong to the coordinates.

    Solar noon is fixed by longitude. A zone an hour out shifts it by an hour,
    which no other test would notice, and every reported time would be wrong.
    Political zones are wide, so the bound allows a genuine two hours.
    """
    for place in PLACES:
        events = sun.day_events(
            date(2026, 6, 21), place.latitude, place.longitude, place.timezone
        )
        highest = events["highest"]["at"]
        hours = highest.hour + highest.minute / 60.0

        assert abs(hours - 12.0) < 2.5, f"{place.slug} peaks at {highest:%H:%M}"
