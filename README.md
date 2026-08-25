# Golden Hour

Find the light. Sunrise, sunset, golden hour and blue hour for anywhere worth
photographing, including the places where the sun does not rise or set at all.

Ask it about Reine in June and it will tell you the sun never sets. Ask about
Tromso in December and it will tell you the sun never rises, and when the sky is
closest to bright anyway.

## Why it is interesting

Most daylight calculators quietly break above the Arctic Circle, because the
usual sunrise equations assume the sun crosses the horizon. This one samples the
sun's altitude across the day instead, so midnight sun and polar night are
ordinary results rather than special cases.

There is no external service behind it. Solar position is arithmetic, so the
answer is computed rather than fetched, the same input always gives the same
output, and there is no key to rotate or quota to exhaust.

## How it is built

The application is small on purpose. The other half of this repository is how it
gets built, deployed and run: reusable Terraform modules, state separated by rate
of change, images promoted by digest rather than rebuilt, and a pipeline that
refuses to deploy something it has not verified.

| Concern | Approach |
|---|---|
| Infrastructure | Terraform, three states split by rate of change and by trust |
| Hosting | Azure Container Apps, scaled to zero when idle |
| Images | Built once, promoted between environments by digest |
| Delivery | Pull request, plan, review, then an approved deploy |
| Credentials | Federated identity, no stored secrets |

A companion repository,
[container-app-in-azure](https://github.com/sindredg/container-app-in-azure),
documents the same platform being learned one phase at a time. That one explains
the reasoning at length. This one is built to be reused.

## Running it locally

    python3 -m venv .venv
    .venv/bin/pip install -r app/requirements-dev.txt
    .venv/bin/python -m pytest app/tests -q
    .venv/bin/uvicorn app.src.main:app --reload --port 8080

Then ask it something:

    curl 'localhost:8080/api/light?place=lofoten&on=2026-06-21'

## Status

Early. The application and its tests exist. Infrastructure is being built up from
the bootstrap stack outward, and nothing is deployed yet.

## Decisions

Architecture decisions, with the alternatives rejected, are in
[docs/decisions](docs/decisions/).
