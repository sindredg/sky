resource "azurerm_user_assigned_identity" "plan" {
  name                = local.names.plan_identity
  resource_group_name = azurerm_resource_group.state.name
  location            = azurerm_resource_group.state.location
  tags                = local.common_tags
}

resource "azurerm_user_assigned_identity" "deploy" {
  name                = local.names.deploy_identity
  resource_group_name = azurerm_resource_group.state.name
  location            = azurerm_resource_group.state.location
  tags                = local.common_tags
}

resource "azurerm_federated_identity_credential" "plan_pull_request" {
  name                      = "github-pull-request"
  user_assigned_identity_id = azurerm_user_assigned_identity.plan.id
  audience                  = ["api://AzureADTokenExchange"]
  issuer                    = "https://token.actions.githubusercontent.com"
  subject                   = "${local.config.github_subject_prefix}:pull_request"
}

resource "azurerm_federated_identity_credential" "deploy_environment" {
  name                      = "github-environment-${var.deploy_environment}"
  user_assigned_identity_id = azurerm_user_assigned_identity.deploy.id
  audience                  = ["api://AzureADTokenExchange"]
  issuer                    = "https://token.actions.githubusercontent.com"
  subject                   = "${local.config.github_subject_prefix}:environment:${var.deploy_environment}"
}

resource "azurerm_role_assignment" "plan_state" {
  scope                            = azurerm_storage_container.state.id
  role_definition_name             = "Storage Blob Data Contributor"
  principal_id                     = azurerm_user_assigned_identity.plan.principal_id
  principal_type                   = "ServicePrincipal"
  skip_service_principal_aad_check = true
  description                      = "Allows pull-request plans to read and lock Terraform state."
}

resource "azurerm_role_assignment" "deploy_state" {
  scope                            = azurerm_storage_container.state.id
  role_definition_name             = "Storage Blob Data Contributor"
  principal_id                     = azurerm_user_assigned_identity.deploy.principal_id
  principal_type                   = "ServicePrincipal"
  skip_service_principal_aad_check = true
  description                      = "Allows approved deployments to update and lock Terraform state."
}

resource "azurerm_role_assignment" "plan_subscription" {
  scope                            = data.azurerm_subscription.current.id
  role_definition_name             = "Reader"
  principal_id                     = azurerm_user_assigned_identity.plan.principal_id
  principal_type                   = "ServicePrincipal"
  skip_service_principal_aad_check = true
  description                      = "Allows pull-request plans to read subscription resources."
}

resource "azurerm_role_assignment" "deploy_subscription" {
  scope                            = data.azurerm_subscription.current.id
  role_definition_name             = "Contributor"
  principal_id                     = azurerm_user_assigned_identity.deploy.principal_id
  principal_type                   = "ServicePrincipal"
  skip_service_principal_aad_check = true
  description                      = "Allows approved deployments to manage application resources."
}
