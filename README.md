# Golden Hour

Sunrise, sunset, golden hour and blue hour for places worth photographing,
including the ones where the sun does not rise or set at all.

Ask about Reine in June and it reports that the sun never sets. Ask about Tromso
in December and it reports polar night, and when the sky is nearest to bright
anyway.

## Why it is interesting

Most daylight calculators break above the Arctic Circle, because the usual
sunrise equations assume the sun crosses the horizon. This one samples the sun's
altitude across the day instead, so midnight sun and polar night are ordinary
results rather than special cases.

Nothing is fetched. Solar and lunar position are arithmetic, so the same question
always returns the same answer, there is no API key to rotate, and no third party
can take the service down.

The moon comes with it: phase, illuminated fraction, moonrise and moonset, and
the dates of solar and lunar eclipses.

## How the light bar works

The bar across the top of the page is not decoration. Each stop is coloured from
the sun's computed altitude at that minute, so the picture is the data. A day in
Lofoten in June has no dark end. A day in Tromso in December has no bright one.

## How it is built

The application is small on purpose. The other half of this repository is how it
gets built, deployed and run.

| Concern | Approach |
|---|---|
| Infrastructure | Terraform, three states split by rate of change and by trust |
| Hosting | Azure Container Apps, scaled to zero when idle |
| Images | Built once, promoted between environments by digest |
| Delivery | Pull request, checks, review, then an approved deploy |
| Credentials | Federated identity, no stored secrets |

`main` is protected. Every change, including changes made by an agent, goes
through a pull request with checks.

A companion repository,
[container-app-in-azure](https://github.com/sindredg/container-app-in-azure),
documents the same platform being learned one phase at a time. That one explains
the reasoning at length. This one is built to be reused.

## Running it

    python3 -m venv .venv
    .venv/bin/pip install -r app/requirements-dev.txt
    .venv/bin/python -m pytest app/tests -q
    .venv/bin/uvicorn app.src.main:app --reload --port 8080

Then open http://localhost:8080, or ask the API directly:

    curl 'localhost:8080/api/light?place=lofoten&on=2026-06-21'
    curl 'localhost:8080/api/moon?place=tromso'
    curl 'localhost:8080/api/eclipses?days=900'

## Accuracy

Solar and lunar positions use standard low precision theory, accurate to a few
arcminutes. That is well inside the error the one minute sampling step already
introduces into rise and set times.

Eclipse detection reports occurrence and kind, not circumstances. Path,
magnitude and local visibility need full ephemerides and are out of scope, which
the endpoint states in its own response.

The tests assert against facts that hold independently of the implementation:
twelve hours of daylight at the equator on the equinox, illumination of exactly
zero at every computed new moon, and the four 2026 eclipses, whose dates were
published decades in advance.

## Status

The application, its tests and the site exist. Terraform is next, and nothing is
deployed yet.

## Decisions

Architecture decisions, with the alternatives rejected, are in
[docs/decisions](docs/decisions/).
