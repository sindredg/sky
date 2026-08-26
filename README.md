# Golden Hour

**[See it running](https://ca-aca-prod-production.yellowglacier-15588c53.norwayeast.azurecontainerapps.io)**

This repository demonstrates a production-oriented delivery pipeline for Azure
Container Apps. Golden Hour is the workload it ships: a planner whose answers
are derived rather than fetched.

Sunrise at Reine on 12 June 2074 is already determined. It follows from orbital
mechanics, so no service has to stay up and no key has to be rotated for the
answer to stay correct. That makes it an unusually clean vehicle for exercising
infrastructure, identity, build, deployment, verification and monitoring: there
is nothing in the application that can rot, so when something breaks it is the
pipeline.

The application calculates sunlight and moon data for 17 places. It handles
midnight sun and polar night by sampling altitude once per minute instead of
assuming the sun crosses the horizon.

No external API, no database, no API key. The same question returns the same
answer.

The deployed service scales to zero, so the first request after an idle period
waits a few seconds while a replica starts.

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

## Deployment

The service runs on Azure Container Apps at
[ca-aca-prod-production.yellowglacier-15588c53.norwayeast.azurecontainerapps.io](https://ca-aca-prod-production.yellowglacier-15588c53.norwayeast.azurecontainerapps.io).

Three Terraform states, split by how often each changes and who may apply it:

| State | Owns | Applied by |
|---|---|---|
| `bootstrap` | State backend, workload identities, every role assignment | A human, twice during the first deployment |
| `platform` | Resource group, registry, Log Analytics, Container Apps environment | The pipeline |
| `application` | The container app, its ingress and scaling | The pipeline |

The pipeline holds Contributor and cannot create role assignments, so it cannot
widen its own permissions. Four workload identities authenticate through GitHub
OIDC, each trusted on exactly one subject: pull request plans, image push,
production deployment, and image pull at runtime.

Images deploy by digest, never by tag, so the running revision names one exact
artifact. `/version` reports the commit that produced it.

Architecture decisions and rejected alternatives are recorded in
[docs/decisions](docs/decisions/).
