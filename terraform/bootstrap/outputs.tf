output "backend" {
  description = "Names required to configure the Azure Blob backend."
  value = {
    resource_group_name  = azurerm_resource_group.state.name
    storage_account_name = azurerm_storage_account.state.name
    container_name       = azurerm_storage_container.state.name
  }
}

output "github_actions" {
  description = "Non-secret identity values for later GitHub configuration."
  value = {
    plan_client_id   = azurerm_user_assigned_identity.plan.client_id
    deploy_client_id = azurerm_user_assigned_identity.deploy.client_id
    tenant_id        = azurerm_user_assigned_identity.deploy.tenant_id
  }
}

output "principal_ids" {
  description = "Object IDs for auditing the fixed role assignments."
  value = {
    plan   = azurerm_user_assigned_identity.plan.principal_id
    deploy = azurerm_user_assigned_identity.deploy.principal_id
  }
}
