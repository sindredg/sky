resource "azurerm_resource_group" "this" {
  name     = local.names.resource_group
  location = local.config.location
  tags     = local.common_tags
}

resource "azurerm_container_registry" "this" {
  name                          = var.container_registry_name
  resource_group_name           = azurerm_resource_group.this.name
  location                      = azurerm_resource_group.this.location
  sku                           = "Standard"
  admin_enabled                 = false
  anonymous_pull_enabled        = false
  public_network_access_enabled = true
  tags                          = local.common_tags
}

resource "azurerm_log_analytics_workspace" "this" {
  name                = local.names.log_analytics_workspace
  resource_group_name = azurerm_resource_group.this.name
  location            = azurerm_resource_group.this.location
  sku                 = "PerGB2018"
  retention_in_days   = local.config.log_retention_days
  tags                = local.common_tags
}

resource "azurerm_container_app_environment" "this" {
  name                       = local.names.container_app_environment
  resource_group_name        = azurerm_resource_group.this.name
  location                   = azurerm_resource_group.this.location
  log_analytics_workspace_id = azurerm_log_analytics_workspace.this.id
  tags                       = local.common_tags
}
