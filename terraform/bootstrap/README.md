# Terraform bootstrap

This root creates the Azure Blob backend and the fixed GitHub Actions identities.
It is applied by a human. Pipelines do not apply or change it.

## Resources

- Resource group and Standard LRS storage account in Norway East
- Private state container with versioning and 30-day recovery
- Delete lock on the storage account
- Reader identity for pull-request plans
- Contributor identity for approved production deployments
- Container-scoped Blob access for Terraform state

Public network access stays enabled for GitHub-hosted runners. Shared keys and
anonymous Blob access are disabled.

## Prerequisites

- Terraform 1.15 or later
- Azure CLI authenticated to the intended tenant and subscription
- Permission to create resource groups, managed identities, role assignments,
  and management locks
- `ARM_SUBSCRIPTION_ID` set in the shell

Do not put the subscription ID in a tracked file or command transcript.

## Fresh deployment order

The registry is created by the platform deployment identity, and the registry
grants are owned by this human-applied root. A fresh environment therefore uses
two bootstrap stages. Existing environments keep registry grants enabled by
default, so this change does not remove their role assignments.

### 1. Create the backend and identities

Run these commands from `terraform/bootstrap`:

    cp bootstrap_override.tf.example bootstrap_override.tf
    terraform init -reconfigure
    terraform fmt -check
    terraform validate
    terraform plan -var=enable_registry_role_assignments=false -out=bootstrap.tfplan
    terraform show bootstrap.tfplan
    terraform apply bootstrap.tfplan
    rm bootstrap_override.tf
    terraform init -migrate-state -backend-config=backend.hcl
    terraform plan -var=enable_registry_role_assignments=false

Review the saved plan before applying it. The apply creates paid Azure resources
and role assignments. It requires the owner's explicit approval.

The final plan must report no changes before the local state copy is removed.
Terraform state and plan files remain ignored. This stage deliberately omits
the two registry grants because their target does not exist yet.

### 2. Configure GitHub and create the platform

`terraform output -json github_actions` returns client and tenant identifiers.
They are not credentials. Adding them to GitHub variables and creating the
protected `production` environment are separate repository-setting changes and
require exact approval.

Set repository variables `AZURE_PLAN_CLIENT_ID`, `AZURE_DEPLOY_CLIENT_ID`, and
`AZURE_TENANT_ID` from `github_actions`. Set `AZURE_PUSH_CLIENT_ID` from
`terraform output -json image_push_identity`. Add the subscription ID as the
`AZURE_SUBSCRIPTION_ID` repository secret, never as a tracked value.

After the variables, subscription secret, and production environment exist,
start the platform workflow and approve its protected apply:

    gh workflow run deploy.yml

The workflow must finish successfully before the next bootstrap stage.

### 3. Grant registry access

Run these commands from `terraform/bootstrap` after the platform workflow has
created the registry:

    terraform plan -var=enable_registry_role_assignments=true -out=registry-bindings.tfplan
    terraform show registry-bindings.tfplan
    terraform apply registry-bindings.tfplan
    terraform plan

The saved plan must add only the `AcrPull` and `AcrPush` role assignments. The
final plan must report no changes. The application release can run after these
grants exist.

Do not set `enable_registry_role_assignments` to false on an established
environment. That value is only for the first bootstrap stage and would plan
removal of the existing registry grants.
