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
