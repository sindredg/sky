variable "container_registry_name" {
  description = "Globally unique name for the production container registry."
  type        = string
  default     = "acracaprod1345665076"

  validation {
    condition     = can(regex("^[a-z0-9]{5,50}$", var.container_registry_name))
    error_message = "The registry name must contain 5 to 50 lowercase letters or numbers."
  }
}
