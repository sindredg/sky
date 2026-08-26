# 0007: The release build pushes with its own branch-scoped identity

Status: accepted

The release build pushes images as `id-aca-prod-push`, which holds `AcrPush` on
the production registry and nothing else. Its federated credential trusts
`repo:...:ref:refs/heads/main`, the branch, rather than an environment.

## Why not reuse the deployment identity

The deployment identity already holds Contributor, which covers
`Microsoft.ContainerRegistry/registries/push/write`, so on permissions alone it
could push. Its federated credential trusts one subject only:
`repo:...:environment:production`.

A job receives that subject only when it declares `environment: production`.
Using the deployment identity in the build would therefore put the image build
behind the deployment approval gate. Every job referencing a protected
environment waits for approval separately, so a two job release would ask for
two approvals, and the slow image build would sit waiting for the first one.

## Why the branch and not the environment

Pushing an image changes nothing that serves traffic. It adds an artifact to a
registry that no running revision references. The deployment is the step that
changes what users reach, so the deployment is where the approval belongs.

Gating the build as well would buy no safety and would train the reviewer to
approve twice without reading either.

## The four identities

| Identity | Trusted subject | Permission |
|---|---|---|
| `id-aca-prod-plan` | `:pull_request` | Reader on the subscription |
| `id-aca-prod-push` | `:ref:refs/heads/main` | `AcrPush` on the registry |
| `id-aca-prod-deploy` | `:environment:production` | Contributor on the subscription |
| `id-aca-prod-pull` | none, runtime only | `AcrPull` on the registry |

Each can do one job. The pusher cannot deploy, because it holds no subscription
role. The deployer needs no registry data plane rights, because Terraform
references an image by digest without reading it. The runtime identity can only
pull.

## Consequences

A fourth identity is a fourth thing to audit, and its client ID becomes a fifth
piece of GitHub configuration.

The registry permission mode hazard in decision 0006 applies here too. A
registry switched to ABAC repository permissions honours neither `AcrPull` nor
`AcrPush`, and both grants in this root would stop working while still
appearing correct.
