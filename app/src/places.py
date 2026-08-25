"""Curated viewpoints. Plain data, so there is nothing to migrate."""

from dataclasses import dataclass


@dataclass(frozen=True)
class Place:
    slug: str
    name: str
    country: str
    latitude: float
    longitude: float
    timezone: str
    note: str


PLACES: tuple[Place, ...] = (
    Place(
        "lofoten",
        "Reine, Lofoten",
        "Norway",
        67.9333,
        13.0833,
        "Europe/Oslo",
        "Midnight sun from late May to mid July.",
    ),
    Place(
        "trolltunga",
        "Trolltunga",
        "Norway",
        60.1242,
        6.7401,
        "Europe/Oslo",
        "The ledge faces east, so the light is best early.",
    ),
    Place(
        "preikestolen",
        "Preikestolen",
        "Norway",
        58.9864,
        6.1904,
        "Europe/Oslo",
        "A fjord below and a long walk up, so plan around sunset.",
    ),
    Place(
        "geiranger",
        "Geirangerfjord",
        "Norway",
        62.1010,
        7.2050,
        "Europe/Oslo",
        "Steep walls mean the sun leaves the water long before it sets.",
    ),
    Place(
        "alesund",
        "Ålesund",
        "Norway",
        62.4722,
        6.1495,
        "Europe/Oslo",
        "The view from Aksla faces west over the islands, so the town is backlit at sunset.",
    ),
    Place(
        "tromso",
        "Tromsø",
        "Norway",
        69.6492,
        18.9553,
        "Europe/Oslo",
        "Polar night from late November to mid January.",
    ),
    Place(
        "santorini",
        "Oia, Santorini",
        "Greece",
        36.4618,
        25.3753,
        "Europe/Athens",
        "The caldera faces west, which is why the sunset is the event.",
    ),
    Place(
        "banff",
        "Moraine Lake, Banff",
        "Canada",
        51.3217,
        -116.1860,
        "America/Edmonton",
        "First light hits the peaks well before it reaches the water.",
    ),
    Place(
        "torres",
        "Torres del Paine",
        "Chile",
        -50.9423,
        -73.4068,
        "America/Santiago",
        "Southern latitude, so the seasons invert.",
    ),
)

BY_SLUG = {p.slug: p for p in PLACES}
