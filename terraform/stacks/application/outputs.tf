output "application_url" {
  description = "Public URL of the deployed container app."
  value       = "https://${azurerm_container_app.this.ingress[0].fqdn}"
}

output "latest_revision_name" {
  description = "Revision currently receiving traffic."
  value       = azurerm_container_app.this.latest_revision_name
}

output "image" {
  description = "Exact image reference the running revision was created from."
  value       = "${data.terraform_remote_state.platform.outputs.container_registry.login_server}/${var.image_repository}@${var.image_digest}"
}
