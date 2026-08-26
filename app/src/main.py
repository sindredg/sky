"""Golden hour planner."""

import os
from datetime import UTC, date, datetime
from pathlib import Path

from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import FileResponse, PlainTextResponse
from fastapi.staticfiles import StaticFiles

from . import moon as lunar
from . import sky, sun
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


def _today(zone) -> date:
    return datetime.now(sky.as_timezone(zone)).date()


def _parse_day(value: str | None, zone=UTC) -> date:
    try:
        return date.fromisoformat(value) if value else _today(zone)
    except ValueError:
        raise HTTPException(status_code=400, detail="date must be YYYY-MM-DD") from None


def _resolve(place, lat, lon, tz):
    """A named place carries its own timezone; a bare coordinate cannot."""
    if place is not None:
        found = BY_SLUG.get(place)
        if found is None:
            raise HTTPException(status_code=404, detail="unknown place")
        return found.latitude, found.longitude, found.timezone, found.name
    if lat is not None and lon is not None:
        return lat, lon, tz, "custom location"
    raise HTTPException(status_code=400, detail="supply place, or lat and lon")


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
                "timezone": p.timezone,
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
    latitude, longitude, zone, label = _resolve(place, lat, lon, tz)
    day = _parse_day(on, zone)
    events = sun.day_events(day, latitude, longitude, zone)

    return {
        "location": label,
        "date": day.isoformat(),
        "latitude": latitude,
        "longitude": longitude,
        "timezone": str(zone),
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
        "curve": events["curve"],
        "curve_step_minutes": events["curve_step_minutes"],
    }


@app.get("/api/moon")
async def moon(
    place: str | None = None,
    lat: float | None = Query(None, ge=-90, le=90),
    lon: float | None = Query(None, ge=-180, le=180),
    on: str | None = None,
    tz: float = Query(0.0, ge=-12, le=14),
) -> dict:
    latitude, longitude, zone, label = _resolve(place, lat, lon, tz)
    day = _parse_day(on, zone)
    events = lunar.day_events(day, latitude, longitude, zone)

    return {
        "location": label,
        "date": day.isoformat(),
        "timezone": str(zone),
        "moonrise": _iso(events["moonrise"]),
        "moonset": _iso(events["moonset"]),
        "highest": {
            "at": _iso(events["highest"]["at"]),
            "altitude": events["highest"]["altitude"],
        },
        "always_up": events["always_up"],
        "never_up": events["never_up"],
        "phase": events["phase"],
        "phase_angle": events["phase_angle"],
        "illumination": events["illumination"],
        "age_days": events["age_days"],
    }


@app.get("/api/eclipses")
async def eclipses(
    since: str | None = None, days: int = Query(400, ge=1, le=1100)
) -> dict:
    start = _parse_day(since)

    return {
        "from": start.isoformat(),
        "days": days,
        "note": "Occurrence only. Path and local visibility need full ephemerides.",
        "eclipses": [
            {
                "at": event["at"].isoformat(timespec="minutes"),
                "kind": event["kind"],
                "moon_latitude": event["moon_latitude"],
            }
            for event in lunar.eclipse_seasons(start, days)
        ],
    }


STATIC = Path(__file__).parent.parent / "static"


@app.get("/")
async def index() -> FileResponse:
    return FileResponse(STATIC / "index.html")


app.mount("/static", StaticFiles(directory=STATIC), name="static")
