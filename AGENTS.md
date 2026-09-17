# Working in this repository

Sky is a browser observatory: the solar system, the night sky, a globe of places
and their light, and the scale of the universe. It computes sun, moon and Milky
Way positions locally, with no external API, no database and no API key.

The application is the product. The
[k8-lab](https://github.com/sindredg/k8-lab) cluster builds this repository at a
pinned commit and serves it at [sindrg.com/sky](https://sindrg.com/sky).
Delivery lives there. This repository is the application alone.

## How we work

Every change goes through a pull request:

1. Branch from an up to date `main`. Name it for the change, lowercase with
   hyphens, for example `add-blue-hour-endpoint`.
2. Make the change. Run the checks. They pass before you push, not after.
3. Push and open a pull request stating what changed, why, and what was
   verified.
4. Let CI finish. A red check is a result, not an inconvenience.
5. Merge only once the checks are green.

`main` is not protected and CI is not a required check, so the sequence above is
a convention rather than something GitHub enforces. Commit 7683fdc deleted
`.github/` directly on `main` with no pull request, which removed CI along with
the workflows. Twenty-six tests then asserted on missing files for ten days
before anything ran them again.

### Agent authority boundary

Agents never merge or close pull requests, never enable auto-merge, never
approve or dismiss reviews, and never force push a shared branch. An agent opens
a pull request, reports its URL and what it verified, then stops.

Agents do not weaken branch protection, required checks, secret scanning or
Actions restrictions. Repository settings, secrets and cloud permissions change
only after explicit approval for the exact mutation.

Ask before changing a version pin, `ruff.toml`, the `filterwarnings` policy in
`pytest.ini`, or the Dockerfile base image. Those are decisions. `app/src`,
`app/static` and `app/tests` are ordinary work.

### Naming commits and pull requests

Pull requests are squash merged, so the pull request title becomes the commit
subject on `main`. Use a conventional prefix and a short imperative subject in
lower case: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`, `ci:`.

    feat: add the moon and eclipse occurrence
    fix: resolve timezones by name instead of a fixed offset

The body explains why the change was made and what it cost. The diff already
says what changed. Wrap it at 72 characters.

Do not stack a pull request on another unless the second depends on the first.
GitHub retargets a stacked pull request to `main` only after its base merges,
and the retarget is not instant. Merging both in quick succession lands the
second in a branch that is already squash merged, so it never reaches `main`
while GitHub still reports it merged. This happened to #18, re-landed as #19.

## Tests assert properties, not copies

Before writing an assertion, ask: if this fails, has something broken, or has
someone made a deliberate decision? If it is the second, the assertion copies
the file beside it and should not exist.

A copy adds no safety, because both values live here and change together, and it
adds friction. A base image duplicated into a test constant once failed a
legitimate Dependabot bump for a reason unrelated to the bump.

Prefer assertions that hold across files, because those catch drift no single
file can see. `test_static_contract.py` checks that every asset `index.html`
references is shipped and that no path escapes the `/static` mount, which is
what keeps the page working behind the `/sky` prefix the cluster strips.

Keep an assertion that encodes a trap failing silently. A supply chain test here
once globbed a directory that had been deleted, found no files, and passed
having checked nothing.

## Attribution

Every agent-authored commit carries the trailer. Decided 2026-08-26.

    Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>

This repository is public and presented as portfolio work. Full disclosure costs
nothing, because what is judged is whether the decisions are sound.

Commits a human writes do not carry it. Neither do Dependabot's.

Count case-insensitively. GitHub normalises the trailer to `Co-authored-by:`
when squash merging.

    git log --format=%b origin/main | grep -ci "co-authored-by: claude"

## Style

Comments are one line, or absent. The bar is not "is this true" but "does the
code already say this".

This applies to commit messages, pull requests, documentation and comments:

- No em-dashes anywhere, including HTML entities. Use a comma, a colon or a full
  stop. `test_no_em_dashes_in_tracked_markdown` enforces this.
- Give the number, not the adjective. "138 tests pass", not "the tests look
  good".
- Cut throat-clearing and filler: `very`, `simply`, `just`, `basically`,
  `robust`, `seamless`.
- Do not stack hedges. Either you checked or you did not.
- Claims carry evidence. State what was run and what it returned, or say plainly
  that it was not checked.

## Local development

    python3 -m venv .venv
    .venv/bin/pip install -r app/requirements-dev.txt

    .venv/bin/python -m pytest app/tests -q
    .venv/bin/ruff check app
    .venv/bin/ruff format --check app
    node --test app/tests/observatory.test.mjs app/tests/frontend/astronomy.test.js

    .venv/bin/uvicorn app.src.main:app --reload --port 8123

All checks pass before you push, not after. `docker compose up --build --wait`
runs the container and `scripts/container-smoke.sh` checks it.

CI runs the same checks inside the image the Dockerfile pins, so the suite runs
on the runtime that ships.

## Layout

`app/src/sky.py` holds what the bodies share: the epoch, timezone resolution,
per minute sampling and threshold crossing. `sun.py`, `moon.py` and `galaxy.py`
each supply an altitude function and build on it. A fourth body would need no
new rise and set logic.

`app/static/` is the browser observatory. `astronomy.js` and `world.js` carry
data tables and an encoded coastline, so their long lines are deliberate.
