locals {
  config = {
    environment    = "production"
    container_port = 8080
    min_replicas   = 0
    max_replicas   = 3
    cpu            = 0.25
    memory         = "0.5Gi"
  }

  names = {
    container_app = "ca-aca-prod-production"
    container     = "goldenhour"
  }

  common_tags = {
    environment = local.config.environment
    managed_by  = "terraform"
    project     = "aca-prod"
  }
}
