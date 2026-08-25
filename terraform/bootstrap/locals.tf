locals {
  config = {
    location              = var.location
    deploy_environment    = var.deploy_environment
    state_retention_days  = 30
    github_subject_prefix = "repo:${var.github_owner}@${var.github_owner_id}/${var.github_repository}@${var.github_repository_id}"
  }

  names = {
    resource_group    = "rg-aca-prod-tfstate"
    state_container   = "tfstate"
    plan_identity     = "id-aca-prod-plan"
    deploy_identity   = "id-aca-prod-deploy"
    state_delete_lock = "lock-aca-prod-tfstate"
  }

  common_tags = {
    environment = "shared"
    managed_by  = "terraform"
    project     = "aca-prod"
    purpose     = "terraform-bootstrap"
  }
}
