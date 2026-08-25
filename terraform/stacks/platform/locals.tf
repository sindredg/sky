locals {
  config = {
    environment        = "production"
    location           = "norwayeast"
    log_retention_days = 30
  }

  names = {
    resource_group            = "rg-aca-prod-production"
    log_analytics_workspace   = "log-aca-prod-production"
    container_app_environment = "cae-aca-prod-production"
  }

  common_tags = {
    environment = local.config.environment
    managed_by  = "terraform"
    project     = "aca-prod"
  }
}
