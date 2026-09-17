# Working in this repository

Sky is a browser observatory: the solar system, the night sky, a globe of places
and their light, and the scale of the universe. No external API, no database, no
API key.

The [k8-lab](https://github.com/sindredg/k8-lab) cluster builds this repository
at a pinned commit and serves it at [sindrg.com/sky](https://sindrg.com/sky).
Delivery lives there. This is the application alone.

Commands are in the README. The code says what it does. This file holds only
what neither of those can tell you.

## Authority

Agents open pull requests and stop. Never merge, close, approve, enable
auto-merge, or force push a shared branch. Never weaken branch protection,
required checks, secret scanning or Actions restrictions.

`main` is not protected and CI is not required, so nothing enforces that but
you. Commit 7683fdc deleted `.github/` straight on `main` and took CI with it.
Twenty-six tests then asserted on missing files for ten days.

## Changes

Branch, pull request, green CI, merge. Squash merge makes the pull request title
the commit subject, so the conventional prefix goes there: `feat: add the moon
and eclipse occurrence`. The body says why and what it cost, not what the diff
already shows.

Never weaken a check to make a failure go away. Narrowing one can be right: the
`pytest.ini` ignore names a single upstream warning and everything else still
errors. Say in the pull request what failed and why the narrowing is the
smallest that works.

Do not stack pull requests. GitHub retargets the child only after the base
merges, and not instantly, so merging both quickly lands the second in a
squash-merged branch where it never reaches `main`. This was #18, re-landed as
#19.

## Tests assert properties, not copies

Before writing an assertion, ask: if this fails, has something broken, or has
someone made a decision? If it is the second, the assertion copies the file
beside it and should not exist. A base image duplicated into a test constant
once failed a legitimate Dependabot bump for an unrelated reason.

Prefer assertions that hold across files, which catch drift no single file sees.
Keep the ones encoding a trap that fails silently. A supply chain test here once
globbed a deleted directory, found nothing, and passed having checked nothing.

## Conventions

Every agent-authored commit carries `Co-Authored-By: Claude Opus 5
<noreply@anthropic.com>`. Human and Dependabot commits do not. GitHub lowercases
it on squash merge, so count with `grep -i`.

Comments are one line or absent. The bar is not "is this true" but "does the
code already say this".

Give the number, not the adjective. Either you checked or you did not.

`astronomy.js` and `world.js` hold data tables and an encoded coastline, so
their long lines are deliberate.
