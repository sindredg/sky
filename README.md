# Golden Hour

Golden Hour is a FastAPI application that calculates sunlight and moon data for
nine places. It handles midnight sun and polar night by sampling altitude once
per minute instead of assuming the sun crosses the horizon.

Calculations run locally. The application has no external API or database.

## Features

- Sunrise, sunset, golden hour, blue hour, and maximum solar altitude
- Moon phase, illumination, moonrise, and moonset
- Solar and lunar eclipse occurrence
- Website with a calculated light bar, dark mode, and a 375px mobile layout
- Internal JSON API, health endpoint, and version endpoint

## Run locally

### Python

    python3 -m venv .venv
    .venv/bin/pip install -r app/requirements-dev.txt
    .venv/bin/uvicorn app.src.main:app --reload --port 8123

Open http://localhost:8123.

### Docker

    docker compose up --build --wait

The default address is http://localhost:8123. To use another host port or set a
version:

    GOLDEN_HOUR_PORT=9123 SERVICE_VERSION=0.1.0-local \
      docker compose up --build --wait

Stop the local stack with `docker compose down`.

## API examples

    curl 'localhost:8123/api/light?place=lofoten&on=2026-06-21'
    curl 'localhost:8123/api/moon?place=tromso'
    curl 'localhost:8123/api/eclipses?days=900'
    curl 'localhost:8123/health'

## Verify

    .venv/bin/python -m pytest app/tests -q
    .venv/bin/ruff check app
    .venv/bin/ruff format --check app
    scripts/container-smoke.sh

## Calculation limits

Solar and lunar positions use low-precision theory. Rise and set times are
limited to one-minute resolution by the sampling interval.

Eclipse results report occurrence and kind. Path, magnitude, and local
visibility require full ephemerides and are outside the current scope.

## Deployment status

The application, container runtime, and Terraform bootstrap are implemented.
The Azure platform foundation is pending review. Nothing is deployed yet.

Architecture decisions and rejected alternatives are recorded in
[docs/decisions](docs/decisions/).
