variable "location" {
  description = "Azure region for bootstrap resources."
  type        = string
  default     = "norwayeast"

  validation {
    condition     = can(regex("^[a-z0-9]+$", var.location))
    error_message = "The location must use the Azure CLI location form."
  }
}

variable "storage_account_name" {
  description = "Globally unique storage account name for Terraform state."
  type        = string
  default     = "stacaprod1345665076"

  validation {
    condition     = can(regex("^[a-z0-9]{3,24}$", var.storage_account_name))
    error_message = "The storage account name must contain 3 to 24 lowercase letters or numbers."
  }
}

variable "github_owner" {
  description = "GitHub account that owns the repository."
  type        = string
  default     = "sindredg"
}

variable "github_owner_id" {
  description = "Immutable numeric ID of the GitHub repository owner."
  type        = string
  default     = "186042440"

  validation {
    condition     = can(regex("^[0-9]+$", var.github_owner_id))
    error_message = "The GitHub owner ID must contain digits only."
  }
}

variable "github_repository" {
  description = "GitHub repository trusted by the Azure identities."
  type        = string
  default     = "aca-prod"
}

variable "github_repository_id" {
  description = "Immutable numeric ID of the GitHub repository."
  type        = string
  default     = "1345665076"

  validation {
    condition     = can(regex("^[0-9]+$", var.github_repository_id))
    error_message = "The GitHub repository ID must contain digits only."
  }
}

variable "deploy_environment" {
  description = "GitHub environment trusted by the deployment identity."
  type        = string
  default     = "production"

  validation {
    condition     = can(regex("^[a-z0-9-]+$", var.deploy_environment))
    error_message = "The deploy environment must use lowercase letters, numbers, or hyphens."
  }
}

variable "platform_resource_group_name" {
  description = "Resource group holding the production container registry."
  type        = string
  default     = "rg-aca-prod-production"
}

variable "enable_registry_role_assignments" {
  description = "Create registry grants after the platform registry exists."
  type        = bool
  default     = true
}

variable "container_registry_name" {
  description = "Production registry the image pull identity may read."
  type        = string
  default     = "acracaprod1345665076"

  validation {
    condition     = can(regex("^[a-z0-9]{5,50}$", var.container_registry_name))
    error_message = "The registry name must contain 5 to 50 lowercase letters or numbers."
  }
}
