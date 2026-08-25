# Azure Container Apps, production style

A containerised application on Azure Container Apps, deployed by pipeline, with
reusable Terraform modules and separated state.

This is the production oriented follow on to
[container-app-in-azure](https://github.com/sindredg/container-app-in-azure), which
documented the same platform being learned one phase at a time. That repository
explains the reasoning. This one is built to be reused: modules with contracts,
state split by rate of change, and the same image promoted between environments
rather than rebuilt.

## Status

Early. The repository is being built up from the bootstrap stack outward, and
nothing is deployed yet.

## Design

Three Terraform states, split by how often each changes and by who is trusted to
apply it.

| State | Applied by | Holds |
|---|---|---|
| bootstrap | A human | State backend, CI identities, federated credentials, role assignments |
| platform | Pipeline | Resource group, network, registry, Container Apps environment, monitoring |
| application | Pipeline | The container app, its revisions, ingress and scaling |

The split solves three problems. The registry has to exist before the pipeline
can push an image to it. An application release should not share a blast radius
with a network change. And the same image, identified by digest, can be promoted
from one environment to the next without rebuilding.

## Decisions

Architecture decisions and the alternatives rejected are recorded in
[docs/decisions](docs/decisions/).
