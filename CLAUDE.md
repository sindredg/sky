# Working in this repository

Production style Azure Container Apps platform. The companion repository
[container-app-in-azure](https://github.com/sindredg/container-app-in-azure) is the
learning lab this grew out of; that one optimises for showing the reasoning, this
one optimises for being reusable and safe to run.

## Hard rules

Never commit Terraform state or plan files. `.gitignore` covers them, do not add
exceptions.

**The subscription ID never appears in a tracked file.** Not in tfvars, not in a
default, not in documentation. It reaches Terraform through `ARM_SUBSCRIPTION_ID`
in the environment. This repository is public and the subscription ID is on the
project redaction list.

Images deploy by digest, never by tag:

    registry.azurecr.io/app@sha256:...

A tag can be moved. A digest names one exact artifact, so dev and production can
be proven to run the same build.

Identity and role assignments live in the bootstrap stack, which a human applies.
The pipeline holds Contributor and cannot create them. This is deliberate: the
pipeline can already delete resources, and destruction is loud and rebuildable,
while a quietly granted permission persists and nobody notices.

## Layout

    terraform/
      bootstrap/     state backend, CI identities, federated credentials, role assignments
      modules/       reusable capabilities, no provider blocks, no environment values
      stacks/
        platform/    resource group, network, registry, environment, monitoring
        application/ the container app, its revisions, ingress and scaling
      environments/  per environment tfvars and backend config

Which stack owns a resource is decided by how often it changes. Anything the
application release touches belongs to `application`. Anything that must exist
before an image can be pushed belongs to `platform`.

## Terraform conventions

Provider configuration lives only in stacks, never in a module.

Every module has `main.tf`, `variables.tf`, `outputs.tf`, `versions.tf` and a
`README.md`. Outputs expose only what a consumer needs.

Each stack has a `locals.tf` holding three maps: `config` for tunable settings,
`names` for the naming convention, and `common_tags`. Modules receive explicit
values, never the whole map.

Variables carry types and, where a wrong value would fail late, a `validation`
block.

## Style

Comments are one line, or absent. The bar is not "is this true" but "does the
code already say this". A comment earns its place only when it describes
something absent from the code, such as why an expected resource is missing.

No em-dashes anywhere in the repository or in code. Use a comma, a colon, or a
full stop.

Reasoning longer than one line belongs in `docs/decisions/`, not in the code.

## Local development

    docker compose up --build

Formatting and validation before any commit:

    terraform fmt -recursive
    terraform validate
