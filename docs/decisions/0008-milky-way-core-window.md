# 0008: The Milky Way core, and the thresholds it needs

Status: accepted

The application reports when the galactic centre is high enough, in dark enough
sky, to be worth photographing. It adds no orbital mechanics and no data.

## Why this feature and not planets

The galactic centre is a **fixed** equatorial coordinate. Sagittarius A* sits at
right ascension 17h45m40.04s and declination -29d00m28.1s, J2000, and it does
not move on any timescale this application cares about. It therefore needs no
orbital theory at all: the coordinate goes straight into
`sky.equatorial_to_altitude`.

Everything else the feature needs already existed. Solar altitude gives
darkness, lunar altitude and illumination give interference, and `sky` provides
sampling and threshold crossing. `galaxy.py` is the third body to plug into
machinery built for exactly that, as `AGENTS.md` anticipated.

A planet would have cost per-body orbital elements for a less useful answer.

## The thresholds, and that they are choices

Three numbers decide the outcome. None is a law of nature, so each is stated
here rather than buried:

| Threshold | Value | Why |
|---|---|---|
| Usable altitude | 10 degrees | Below roughly ten degrees the core sits behind five air masses, and atmospheric extinction removes it |
| Dark enough | Sun at -18 degrees | Astronomical twilight, the same threshold the light bar already draws |
| Moon washes out | 40 percent lit, above the horizon for most of the window | A gibbous moon brightens the sky past the core itself |

Raising the altitude threshold makes marginal latitudes report `too_low`.
Lowering it promises windows that a camera cannot use. Ten is a photographer's
convention rather than a derived value.

## Sampling noon to noon

`sample_day` runs local midnight to local midnight, which is right for the sun
and wrong here. The core window normally spans midnight, so a calendar day would
split it across both ends and `crossings` would report a window running
backwards.

The night is therefore sampled from local noon to local noon, which puts it in
the middle of the span. `sky.sample_between` was added for this and `sample_day`
now delegates to it.

Steps are five minutes rather than one. Three bodies over 24 hours at one minute
is 4320 evaluations per request, and lunar position is the expensive one. Five
minutes is well inside the precision anyone can act on.

## The outcome is always a reason

An empty window is not an answer. The endpoint returns one of
`never_rises`, `too_low`, `no_astronomical_darkness`, `moon_washes_it_out`, or
no reason at all with a window.

A washed out window is still reported, because knowing when it would have been
is what tells you to come back next week.

## What this shows about the place list

Peak altitude is `90 - |latitude - (-29.0078)|`, so the answer is fixed by
latitude alone:

| Place | Peak | Outcome |
|---|---|---|
| Svalbard, Tromso, Lofoten, Kirkjufell, Alesund, Geiranger | below zero | never rises |
| Trolltunga, Preikestolen, Banff | 0.9 to 9.7 | too low |
| Tre Cime, Barcelona, Santorini, Teide | 14 to 33 | workable |
| Atacama, Sossusvlei, Uluru | 84 to 86 | near overhead |

Six of seventeen places can never see it. That is the correct answer, and the
application says so rather than returning nothing.

## Consequences

The feature inherits the property the rest of the application has: the answer
for any night in 2074 is already determined and needs nothing fetched. It also
inherits the accuracy bound in the README, since it uses the same solar and
lunar models for darkness and interference.
