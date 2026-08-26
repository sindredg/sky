# 0006: A dedicated image pull identity, and the registry permission mode

Status: accepted

The container app pulls images with `id-aca-prod-pull`, a user-assigned managed
identity holding `AcrPull` on the production registry and nothing else. The
bootstrap root owns both the identity and the grant.

## Why the identity is user-assigned

A system-assigned identity does not exist until the container app exists. The
pipeline cannot grant it `AcrPull` afterwards, because the deployment identity
holds Contributor and Contributor cannot create role assignments. That ordering
has no solution: the app cannot start without pull access, and pull access
cannot be granted until the app has started.

A user-assigned identity is created before the app, so bootstrap grants it
first and the application stack references it.

## Why the deployment identity needs no registry grant

`AcrPush` is defined entirely in `Actions`, not `DataActions`. Its two entries
are `Microsoft.ContainerRegistry/registries/pull/read` and
`Microsoft.ContainerRegistry/registries/push/write`. Contributor is `Actions:
["*"]` minus the authorization `notActions`, so it already covers the push
action. Adding `AcrPush` to the deployment identity would grant nothing new.

## The registry is resolved, not referenced

The registry lives in the platform state. Bootstrap reads it with a
`data "azurerm_container_registry"` lookup by name rather than a literal
resource ID, because a literal ID contains the subscription ID and this
repository is public.

## The hazard worth knowing

Azure Container Registry has two role assignment modes.

| Mode | Honours |
|---|---|
| `LegacyRegistryPermissions` | `AcrPull`, `AcrPush`, `AcrDelete` |
| RBAC Registry with ABAC Repository Permissions | `Container Registry Repository Reader`, `Writer`, `Contributor` only |

The production registry was `LegacyRegistryPermissions` when checked on
2026-08-26, which is why `AcrPull` is correct here. **Switching the registry to
ABAC repository permissions silently stops `AcrPull` being honoured**, and
image pulls begin failing with an authorization error while the role assignment
still appears present and correct. Change the mode only together with the role
in this root.

Managed identity pull also requires the registry to accept ARM audience tokens.
That setting was `enabled` when checked. Disabling it fails pulls with
`UNAUTHORIZED` and a token validation message, which does not name the setting.

## Consequences

An agent cannot grant registry access, because the grant lives in the
human-applied root. Adding a second application means a second identity and a
second human-reviewed bootstrap change, which is the intended friction.
