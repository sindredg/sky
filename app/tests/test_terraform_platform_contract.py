import re
from pathlib import Path

ROOT = Path(__file__).parents[2]
PLATFORM = ROOT / "terraform" / "stacks" / "platform"
UUID = re.compile(
    r"\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-"
    r"[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\b"
)


def artifacts(pattern: str) -> list[Path]:
    # .terraform holds Terraform's own working files, gitignored and never tracked.
    return [path for path in PLATFORM.rglob(pattern) if ".terraform" not in path.parts]


def read(name: str) -> str:
    return (PLATFORM / name).read_text()


def test_platform_root_keeps_state_and_provider_contract():
    backend = read("backend.hcl")
    providers = read("providers.tf")
    versions = read("versions.tf")

    assert 'required_version = ">= 1.15.0, < 2.0.0"' in versions
    assert 'version = "~> 5.0"' in versions
    assert 'backend "azurerm" {}' in versions
    assert 'key                  = "production/platform/terraform.tfstate"' in backend
    assert "use_azuread_auth = true" in backend
    assert "use_cli" not in backend
    assert "storage_use_azuread = true" in providers


def test_platform_resources_match_public_consumption_boundary():
    main = read("main.tf")
    locals_tf = read("locals.tf")

    assert 'resource "azurerm_resource_group" "this"' in main
    assert 'resource "azurerm_container_registry" "this"' in main
    assert re.search(r'sku\s*=\s*"Standard"', main)
    assert re.search(r"admin_enabled\s*=\s*false", main)
    assert re.search(r"anonymous_pull_enabled\s*=\s*false", main)
    assert re.search(r"public_network_access_enabled\s*=\s*true", main)
    assert 'resource "azurerm_log_analytics_workspace" "this"' in main
    assert re.search(r'sku\s*=\s*"PerGB2018"', main)
    assert "retention_in_days   = local.config.log_retention_days" in main
    assert 'resource "azurerm_container_app_environment" "this"' in main
    assert "log_analytics_workspace_id" in main
    assert re.search(r'logs_destination\s*=\s*"log-analytics"', main)
    assert 'location           = "norwayeast"' in locals_tf
    assert "log_retention_days = 30" in locals_tf
    assert re.search(r'environment\s*=\s*"production"', locals_tf)


def test_platform_outputs_expose_only_application_inputs():
    outputs = read("outputs.tf")
    locals_tf = read("locals.tf")

    assert 'output "resource_group"' in outputs
    assert 'output "container_registry"' in outputs
    assert 'output "container_app_environment"' in outputs
    assert "config = {" in locals_tf
    assert "names = {" in locals_tf
    assert "common_tags = {" in locals_tf


def test_platform_has_no_runtime_or_authority_resources():
    files = [path for path in artifacts("*") if path.is_file()]
    tracked_text = "\n".join(
        path.read_text() for path in files if path.suffix in {".tf", ".hcl", ".md"}
    )

    for forbidden in (
        'resource "azurerm_role_assignment"',
        'resource "azurerm_user_assigned_identity"',
        'resource "azurerm_virtual_network"',
        'resource "azurerm_container_app"',
        "subscription_id",
    ):
        assert forbidden not in tracked_text

    assert not UUID.search(tracked_text)
    assert not artifacts("*.tfstate")
    assert not artifacts("*.tfplan")


def test_environment_links_its_workspace_instead_of_only_streaming_logs():
    main = read("main.tf")

    # Omitting logs_destination streams logs and silently ignores the workspace.
    assert "log_analytics_workspace_id" in main
    assert re.search(r'logs_destination\s*=\s*"log-analytics"', main)


def test_environment_is_created_with_a_workload_profile():
    main = read("main.tf")

    # The environment type is fixed at creation and cannot be converted later.
    assert re.search(r"workload_profile\s*{", main)
    assert re.search(r'name\s*=\s*"Consumption"', main)
    assert re.search(r'workload_profile_type\s*=\s*"Consumption"', main)
