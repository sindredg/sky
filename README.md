# Sky

The application calculates sunlight and moon data for 23 places. It handles
midnight sun and polar night by sampling altitude once per minute instead of
assuming the sun crosses the horizon.

No external API, no database, no API key. The same question returns the same
answer.

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

Solar coordinates follow the US Naval Observatory's
[approximate solar model](https://aa.usno.navy.mil/faq/sun_approx). Lunar
coordinates follow Paul Schlyter's
[low-precision model](https://stjarnhimlen.se/comp/ppcomp.html).

Five geocentric lunar positions in 2026 are checked against NASA JPL
[Horizons](https://ssd.jpl.nasa.gov/horizons/) DE441 output. Those samples are
within 3 arcminutes in ecliptic longitude and latitude. This bounded check is
not a general accuracy guarantee. Rise and set times also use one-minute
sampling and simplified horizon corrections.

The arithmetic is permanent. The delivery is not, and the distinction is worth
stating: daylight saving rules are political rather than astronomical, so IANA
timezone data genuinely needs updating, and the runtime dependencies and base
image need security patches. Dependabot watches all three.

Eclipse results report occurrence and kind. Path, magnitude, and local
visibility require full ephemerides and are outside the current scope.

## Review limits

Pull requests preserve a reviewable history and required checks enforce the
automated contracts. This is an owner-maintained project, so those pull
requests are not independent peer review unless another reviewer participates.
Green CI demonstrates that the checked contracts pass. It is not external
validation of the architecture or astronomy.
