output "resource_group" {
  description = "Production resource group details."
  value = {
    name     = azurerm_resource_group.this.name
    location = azurerm_resource_group.this.location
  }
}

output "container_registry" {
  description = "Registry values required by image build and application deployment."
  value = {
    id           = azurerm_container_registry.this.id
    name         = azurerm_container_registry.this.name
    login_server = azurerm_container_registry.this.login_server
  }
}

output "container_app_environment" {
  description = "Container Apps environment values required by the application stack."
  value = {
    id   = azurerm_container_app_environment.this.id
    name = azurerm_container_app_environment.this.name
  }
}
