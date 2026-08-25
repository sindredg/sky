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

## Initial apply and state migration

Run these commands from `terraform/bootstrap`:

    terraform init -backend=false
    terraform fmt -check
    terraform validate
    terraform plan -out=bootstrap.tfplan
    terraform show bootstrap.tfplan
    terraform apply bootstrap.tfplan
    terraform init -migrate-state -backend-config=backend.hcl
    terraform plan

Review the saved plan before applying it. The apply creates paid Azure resources
and role assignments. It requires the owner's explicit approval.

The final plan must report no changes before the local state copy is removed.
Terraform state and plan files remain ignored.

## Later GitHub configuration

`terraform output -json github_actions` returns client and tenant identifiers.
They are not credentials. Adding them to GitHub variables and creating the
protected `production` environment are separate repository-setting changes and
require exact approval.
