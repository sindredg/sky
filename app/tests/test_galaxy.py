"""The galactic centre is a fixed point, so these outcomes are latitude and season."""

from datetime import date

from app.src import galaxy

# Reine, Lofoten. Peak core altitude is 90 - |67.9333 - (-29.0078)| = -6.9.
LOFOTEN = (67.9333, 13.0833, "Europe/Oslo")

# San Pedro de Atacama. Peak is 83.9, near overhead.
ATACAMA = (-22.9087, -68.1997, "America/Santiago")

# Oia, Santorini. Peak is 24.5, workable.
SANTORINI = (36.4618, 25.3753, "Europe/Athens")

# Not a listed place. Chosen because the core clears 10 degrees here while
# midsummer twilight never reaches -18, which no listed place does at once.
NO_DARKNESS = (50.0, 8.0, "Europe/Berlin")


def test_the_core_never_rises_north_of_its_reach():
    result = galaxy.core_window(date(2026, 8, 27), *LOFOTEN)

    assert result["reason"] == "never_rises"
    assert result["window"] is None
    assert result["peak_altitude"] < 0


def test_the_core_reaches_near_overhead_in_the_atacama():
    result = galaxy.core_window(date(2026, 6, 21), *ATACAMA)

    assert result["peak_altitude"] > 80
    assert result["window"] is not None
    assert result["window"]["start"] < result["window"]["end"]


def test_a_northern_summer_night_never_gets_dark_enough():
    result = galaxy.core_window(date(2026, 6, 21), *NO_DARKNESS)

    assert result["reason"] == "no_astronomical_darkness"
    assert result["window"] is None
    # The core does clear the threshold. Darkness is what is missing.
    assert result["peak_altitude"] > 10


def test_a_full_moon_washes_out_an_otherwise_good_window():
    # Chosen by searching for a full moon over the Atacama core season.
    washed = galaxy.core_window(date(2026, 6, 1), *ATACAMA)
    clear = galaxy.core_window(date(2026, 6, 15), *ATACAMA)

    assert washed["moon"]["illumination"] > 0.9
    assert washed["reason"] == "moon_washes_it_out"
    assert clear["reason"] is None
    assert clear["window"] is not None


def test_the_window_lies_inside_the_night():
    result = galaxy.core_window(date(2026, 6, 15), *ATACAMA)
    start = result["window"]["start"]
    end = result["window"]["end"]

    # A window that wrapped midnight incorrectly would run backwards.
    assert end > start
    # Nothing usable happens in the afternoon.
    assert start.hour >= 17 or start.hour <= 6


def test_santorini_is_workable_but_not_overhead():
    result = galaxy.core_window(date(2026, 7, 15), *SANTORINI)

    assert 20 < result["peak_altitude"] < 30
    assert result["window"] is not None


def test_the_fixed_coordinate_is_sagittarius_a_star():
    # RA 17h45m40.04s, Dec -29d00m28.1s, J2000. It does not move.
    assert abs(galaxy.RIGHT_ASCENSION_HOURS - 17.7611) < 0.001
    assert abs(galaxy.DECLINATION_DEGREES - -29.0078) < 0.001
