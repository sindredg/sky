"""Golden hour planner."""

import os
from datetime import date, datetime

from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import PlainTextResponse

from . import solar
from .places import BY_SLUG, PLACES

SERVICE_VERSION = os.getenv("SERVICE_VERSION", "0.0.0-local")

app = FastAPI(
    title="Golden hour planner",
    version=SERVICE_VERSION,
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
)


def _iso(value):
    return value.isoformat(timespec="minutes") if isinstance(value, datetime) else None


def _window(pair):
    start, end = pair
    return {"start": _iso(start), "end": _iso(end)}


@app.get("/health", response_class=PlainTextResponse)
async def health() -> str:
    return "healthy\n"


@app.get("/version")
async def version() -> dict:
    return {"service": "golden-hour", "version": SERVICE_VERSION}


@app.get("/api/places")
async def list_places() -> dict:
    return {
        "places": [
            {
                "slug": p.slug,
                "name": p.name,
                "country": p.country,
                "latitude": p.latitude,
                "longitude": p.longitude,
                "note": p.note,
            }
            for p in PLACES
        ]
    }


@app.get("/api/light")
async def light(
    place: str | None = None,
    lat: float | None = Query(None, ge=-90, le=90),
    lon: float | None = Query(None, ge=-180, le=180),
    on: str | None = None,
    tz: float = Query(0.0, ge=-12, le=14),
) -> dict:
    if place is not None:
        found = BY_SLUG.get(place)
        if found is None:
            raise HTTPException(status_code=404, detail="unknown place")
        latitude, longitude, offset, label = (
            found.latitude,
            found.longitude,
            found.utc_offset_hours,
            found.name,
        )
    elif lat is not None and lon is not None:
        latitude, longitude, offset, label = lat, lon, tz, "custom location"
    else:
        raise HTTPException(status_code=400, detail="supply place, or lat and lon")

    try:
        day = date.fromisoformat(on) if on else date.today()
    except ValueError:
        raise HTTPException(status_code=400, detail="on must be YYYY-MM-DD")

    events = solar.day_events(day, latitude, longitude, offset)

    return {
        "location": label,
        "date": day.isoformat(),
        "latitude": latitude,
        "longitude": longitude,
        "utc_offset_hours": offset,
        "sunrise": _iso(events["sunrise"]),
        "sunset": _iso(events["sunset"]),
        "golden_hour_morning": _window(events["golden_hour_morning"]),
        "golden_hour_evening": _window(events["golden_hour_evening"]),
        "blue_hour_morning": _window(events["blue_hour_morning"]),
        "highest": {
            "at": _iso(events["highest"]["at"]),
            "altitude": events["highest"]["altitude"],
        },
        "lowest": {
            "at": _iso(events["lowest"]["at"]),
            "altitude": events["lowest"]["altitude"],
        },
        "midnight_sun": events["midnight_sun"],
        "polar_night": events["polar_night"],
        "daylight_minutes": events["daylight_minutes"],
    }
