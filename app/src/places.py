"""Curated viewpoints. Plain data, so there is nothing to migrate."""

from dataclasses import dataclass


@dataclass(frozen=True)
class Place:
    slug: str
    name: str
    country: str
    latitude: float
    longitude: float
    utc_offset_hours: float
    note: str


PLACES: tuple[Place, ...] = (
    Place("lofoten", "Reine, Lofoten", "Norway", 67.9333, 13.0833, 2.0,
          "Midnight sun from late May to mid July."),
    Place("trolltunga", "Trolltunga", "Norway", 60.1242, 6.7401, 2.0,
          "The ledge faces east, so the light is best early."),
    Place("preikestolen", "Preikestolen", "Norway", 58.9864, 6.1904, 2.0,
          "A fjord below and a long walk up, so plan around sunset."),
    Place("geiranger", "Geirangerfjord", "Norway", 62.1010, 7.2050, 2.0,
          "Steep walls mean the sun leaves the water long before it sets."),
    Place("tromso", "Tromso", "Norway", 69.6492, 18.9553, 2.0,
          "Polar night from late November to mid January."),
    Place("santorini", "Oia, Santorini", "Greece", 36.4618, 25.3753, 3.0,
          "The caldera faces west, which is why the sunset is the event."),
    Place("banff", "Moraine Lake, Banff", "Canada", 51.3217, -116.1860, -6.0,
          "First light hits the peaks well before it reaches the water."),
    Place("torres", "Torres del Paine", "Chile", -50.9423, -73.4068, -3.0,
          "Southern latitude, so the seasons invert."),
)

BY_SLUG = {p.slug: p for p in PLACES}
