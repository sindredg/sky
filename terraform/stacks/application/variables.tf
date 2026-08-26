variable "image_digest" {
  description = "Digest of the image to run, as sha256:<64 hex characters>."
  type        = string

  validation {
    condition     = can(regex("^sha256:[0-9a-f]{64}$", var.image_digest))
    error_message = "The image digest must be sha256: followed by 64 hex characters."
  }
}

variable "image_repository" {
  description = "Repository holding the application image inside the registry."
  type        = string
  default     = "goldenhour"
}

variable "pull_identity_name" {
  description = "Bootstrap identity holding AcrPull on the production registry."
  type        = string
  default     = "id-aca-prod-pull"
}

variable "bootstrap_resource_group_name" {
  description = "Resource group holding the bootstrap state and identities."
  type        = string
  default     = "rg-aca-prod-tfstate"
}

variable "state_storage_account_name" {
  description = "Storage account holding the Terraform state for every stack."
  type        = string
  default     = "stacaprod1345665076"
}

variable "state_container_name" {
  description = "Blob container holding the Terraform state for every stack."
  type        = string
  default     = "tfstate"
}
