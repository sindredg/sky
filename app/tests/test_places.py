"""The place list is data, so the tests guard the data."""

from zoneinfo import ZoneInfo

from app.src.places import BY_SLUG, PLACES


def test_alesund_is_present_and_correctly_located():
    place = BY_SLUG["alesund"]
    assert place.name == "Ålesund"
    assert place.country == "Norway"
    assert 62.3 < place.latitude < 62.6
    assert 6.0 < place.longitude < 6.3
    assert place.timezone == "Europe/Oslo"


def test_norwegian_names_use_norwegian_characters():
    assert BY_SLUG["tromso"].name == "Tromsø"
    assert BY_SLUG["alesund"].name == "Ålesund"


def test_slugs_are_ascii_and_url_safe():
    for place in PLACES:
        assert place.slug.isascii()
        assert place.slug == place.slug.lower()
        assert " " not in place.slug


def test_every_timezone_resolves():
    for place in PLACES:
        ZoneInfo(place.timezone)


def test_slugs_are_unique():
    assert len({p.slug for p in PLACES}) == len(PLACES)


def test_every_place_has_a_note():
    for place in PLACES:
        assert place.note.strip()
        assert place.note.endswith(".")


def test_teide_and_barcelona_are_present_and_correctly_located():
    teide = BY_SLUG["teide"]
    assert teide.country == "Spain"
    assert 28.1 < teide.latitude < 28.4
    assert teide.timezone == "Atlantic/Canary"

    barcelona = BY_SLUG["barcelona"]
    assert barcelona.country == "Spain"
    assert 41.3 < barcelona.latitude < 41.5
    assert barcelona.timezone == "Europe/Madrid"


def test_the_canaries_keep_their_own_timezone():
    # Atlantic/Canary is an hour behind Europe/Madrid, so the mainland zone
    # would put every Teide time an hour out.
    assert BY_SLUG["teide"].timezone != BY_SLUG["barcelona"].timezone


def test_svalbard_is_the_furthest_north():
    assert BY_SLUG["svalbard"].latitude == max(p.latitude for p in PLACES)
    assert BY_SLUG["svalbard"].latitude > 66.56


def test_the_list_reaches_both_hemispheres():
    assert any(p.latitude > 66.56 for p in PLACES)
    assert any(p.latitude < 0 for p in PLACES)


def test_places_are_spread_across_more_than_one_country():
    assert len({p.country for p in PLACES}) >= 8


def test_monrovia_barely_changes_length_across_the_year():
    from datetime import date

    from app.src import sun

    place = BY_SLUG["monrovia"]
    june = sun.day_events(
        date(2026, 6, 21), place.latitude, place.longitude, place.timezone
    )
    december = sun.day_events(
        date(2026, 12, 21), place.latitude, place.longitude, place.timezone
    )

    # Six degrees off the equator, so the solstices are barely an hour apart.
    difference = abs(june["daylight_minutes"] - december["daylight_minutes"])
    assert difference < 60


def test_ushuaia_is_the_southern_answer_to_tromso():
    assert BY_SLUG["ushuaia"].latitude == min(p.latitude for p in PLACES)
    assert BY_SLUG["ushuaia"].latitude < -50


def test_the_list_spans_the_tropics_and_both_high_latitudes():
    latitudes = [p.latitude for p in PLACES]

    assert max(latitudes) > 66.56
    assert min(latitudes) < -50
    assert any(abs(lat) < 10 for lat in latitudes)
