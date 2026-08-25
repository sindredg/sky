# 2. Required checks on main

## Status

Accepted.

## Context

`main` required a pull request from the first day the remote existed, and for
three pull requests that was the whole gate. Continuous integration arrived in
the second of them, but nothing connected the two: a pull request with a failing
suite could still be merged, because the checks were advisory.

A gate that looks complete and is not is worse than an obvious gap, because
nobody thinks to look at it.

## Decision

`python tests` and `ruff` are required status checks on `main`, with
`strict` enabled so a branch must be current with `main` before it merges.

## Consequences

A red suite blocks a merge, including for an administrator, because
`enforce_admins` is already on. Fixing a broken `main` therefore means another
pull request rather than a quick push.

`strict` means a branch that has fallen behind must be updated before merging.
That costs a rebase on a busy day and removes the case where two changes each
pass alone and fail together.

Renaming a job in `ci.yml` breaks the requirement silently, because the required
context is matched by name. A rename has to be paired with a protection update.

## Alternatives

**Leave the checks advisory.** No friction, and the pull request still shows a
red mark that a careful person would notice. Rejected because it relies on
attention rather than a control, which is the thing this repository argues
against everywhere else.

**Require a review as well.** Stronger, and unavailable to a solo repository,
since GitHub will not let an author approve their own pull request.
