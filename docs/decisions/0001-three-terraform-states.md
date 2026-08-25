# 1. Three Terraform states

## Status

Accepted.

## Context

The learning lab that preceded this repository used a single Terraform root for
everything except its state backend. That worked because there was one
environment and one release path, and it stopped working for three reasons.

The registry has to exist before a pipeline can push an image into it. With one
state, the first apply and the first build are tangled together.

An application release and a network change shared a blast radius. A plan that
was meant to move traffic between revisions would also show pending changes to
the environment, and a reviewer had to read both to approve either.

Promoting a build between environments had no expression at all, because there
was only one environment.

## Decision

Three states, split by rate of change and by who is trusted to apply them.

Bootstrap is applied by a human and holds the state backend, the CI identities,
their federated credentials, and every role assignment.

Platform is applied by the pipeline and holds everything that must exist before
an image can be pushed: resource group, network, registry, the Container Apps
environment, and monitoring.

Application is applied by the pipeline and holds only what a release touches:
the container app, its revisions, ingress and scaling.

## Consequences

The pipeline cannot grant permissions, because the role assignments are in a
state it does not apply. It can still delete what it manages. That is accepted:
destruction is loud and rebuilt from code, while a quiet grant of access
persists and nobody notices.

Three states mean three backends to configure and three plans to read. Ordering
becomes explicit rather than implied, and a platform change must be applied
before an application change that depends on it.

Outputs become an interface. Anything the application stack needs from platform
has to be an output rather than a reference, which is more work and makes the
dependency visible.

## Alternatives

**One state for everything.** Simplest, and what the lab did. Rejected because
the registry ordering problem has no clean answer inside a single state, and
because a release plan that also shows infrastructure drift is a plan people
learn to skim.

**A state per module.** Maximum isolation. Rejected as more coordination than a
platform this size can justify, and it would turn ordinary changes into
multi-repository choreography.
