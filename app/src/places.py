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
        "svalbard",
        "Longyearbyen, Svalbard",
        "Norway",
        78.2232,
        15.6267,
        "Arctic/Longyearbyen",
        "The furthest north here. Polar night from late October, midnight sun from late April.",
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
    Place(
        "teide",
        "Mount Teide, Tenerife",
        "Spain",
        28.2716,
        -16.6425,
        "Atlantic/Canary",
        "Often above the cloud layer, so the sun sets into cloud rather than sea.",
    ),
    Place(
        "barcelona",
        "Barcelona",
        "Spain",
        41.3874,
        2.1686,
        "Europe/Madrid",
        "The Eixample grid is rotated off the compass, so the light runs down the streets twice a year.",
    ),
    Place(
        "kirkjufell",
        "Kirkjufell",
        "Iceland",
        64.9271,
        -23.3075,
        "Atlantic/Reykjavik",
        "Just south of the Arctic Circle, so twilight lasts most of the night in summer.",
    ),
    Place(
        "tre-cime",
        "Tre Cime di Lavaredo",
        "Italy",
        46.6183,
        12.3033,
        "Europe/Rome",
        "The north faces catch alpenglow after the valley has gone dark.",
    ),
    Place(
        "sossusvlei",
        "Sossusvlei",
        "Namibia",
        -24.7272,
        15.3444,
        "Africa/Windhoek",
        "Low sun rakes the dunes, so the shape is only there for the first and last hour.",
    ),
    Place(
        "uluru",
        "Uluru",
        "Australia",
        -25.3444,
        131.0369,
        "Australia/Darwin",
        "The rock reddens as the sun drops, and the colour is gone within minutes.",
    ),
    Place(
        "atacama",
        "San Pedro de Atacama",
        "Chile",
        -22.9087,
        -68.1997,
        "America/Santiago",
        "The driest desert on earth, so twilight is unusually clean.",
    ),
)

BY_SLUG = {p.slug: p for p in PLACES}
