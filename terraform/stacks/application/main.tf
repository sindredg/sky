data "terraform_remote_state" "platform" {
  backend = "azurerm"

  config = {
    resource_group_name  = var.bootstrap_resource_group_name
    storage_account_name = var.state_storage_account_name
    container_name       = var.state_container_name
    key                  = "production/platform/terraform.tfstate"
    use_azuread_auth     = true
  }
}

# The identity is granted in the bootstrap root, so it is resolved by name.
data "azurerm_user_assigned_identity" "pull" {
  name                = var.pull_identity_name
  resource_group_name = var.bootstrap_resource_group_name
}

resource "azurerm_container_app" "this" {
  name                         = local.names.container_app
  resource_group_name          = data.terraform_remote_state.platform.outputs.resource_group.name
  container_app_environment_id = data.terraform_remote_state.platform.outputs.container_app_environment.id
  revision_mode                = "Single"
  tags                         = local.common_tags

  identity {
    type         = "UserAssigned"
    identity_ids = [data.azurerm_user_assigned_identity.pull.id]
  }

  registry {
    server   = data.terraform_remote_state.platform.outputs.container_registry.login_server
    identity = data.azurerm_user_assigned_identity.pull.id
  }

  ingress {
    external_enabled = true
    target_port      = local.config.container_port
    transport        = "auto"

    traffic_weight {
      latest_revision = true
      percentage      = 100
    }
  }

  template {
    min_replicas = local.config.min_replicas
    max_replicas = local.config.max_replicas

    container {
      name   = local.names.container
      image  = "${data.terraform_remote_state.platform.outputs.container_registry.login_server}/${var.image_repository}@${var.image_digest}"
      cpu    = local.config.cpu
      memory = local.config.memory

      # Container Apps ignores the Dockerfile HEALTHCHECK, so the probes repeat it.
      liveness_probe {
        transport = "HTTP"
        port      = local.config.container_port
        path      = "/health"
      }

      readiness_probe {
        transport = "HTTP"
        port      = local.config.container_port
        path      = "/health"
      }
    }
  }
}
