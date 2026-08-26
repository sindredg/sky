import re
from pathlib import Path

ROOT = Path(__file__).parents[2]
APPLICATION = ROOT / "terraform" / "stacks" / "application"
UUID = re.compile(
    r"\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-"
    r"[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\b"
)


def artifacts(pattern: str) -> list[Path]:
    # .terraform holds Terraform's own working files, gitignored and never tracked.
    return [
        path for path in APPLICATION.rglob(pattern) if ".terraform" not in path.parts
    ]


def read(name: str) -> str:
    return (APPLICATION / name).read_text()


def test_application_keeps_its_own_state_and_provider_contract():
    backend = read("backend.hcl")
    versions = read("versions.tf")
    providers = read("providers.tf")

    assert 'required_version = ">= 1.15.0, < 2.0.0"' in versions
    assert 'version = "~> 5.0"' in versions
    assert 'backend "azurerm" {}' in versions
    assert (
        'key                  = "production/application/terraform.tfstate"' in backend
    )
    assert "use_azuread_auth = true" in backend
    assert "use_cli" not in backend
    assert "storage_use_azuread = true" in providers


def test_the_image_is_pinned_by_digest_and_never_by_tag():
    main = read("main.tf")
    variables = read("variables.tf")

    # A tag can be moved. A digest names one exact artifact.
    assert 'variable "image_digest"' in variables
    assert "^sha256:[0-9a-f]{64}$" in variables
    assert "@${var.image_digest}" in main
    assert not re.search(r'image\s*=\s*"[^"]*:latest"', main)


def test_the_app_pulls_with_the_bootstrap_identity_and_no_password():
    main = read("main.tf")

    assert 'data "azurerm_user_assigned_identity" "pull"' in main
    assert 'type         = "UserAssigned"' in main
    assert "identity = data.azurerm_user_assigned_identity.pull.id" in main
    assert "password_secret_name" not in main
    assert "username" not in main


def test_platform_values_arrive_as_outputs_rather_than_references():
    main = read("main.tf")

    # Decision 0001 makes the platform boundary an output interface.
    assert 'data "terraform_remote_state" "platform"' in main
    assert 'key                  = "production/platform/terraform.tfstate"' in main
    assert (
        "data.terraform_remote_state.platform.outputs.container_app_environment" in main
    )
    assert "data.terraform_remote_state.platform.outputs.container_registry" in main


def test_ingress_and_health_match_the_container_contract():
    main = read("main.tf")
    locals_tf = read("locals.tf")

    assert "external_enabled = true" in main
    assert re.search(r"container_port\s*=\s*8080", locals_tf)
    assert "liveness_probe" in main
    assert "readiness_probe" in main
    assert main.count('path      = "/health"') == 2
    assert 'transport = "HTTP"' in main


def test_the_app_scales_to_zero():
    locals_tf = read("locals.tf")

    assert re.search(r"min_replicas\s*=\s*0", locals_tf)


def test_application_owns_no_platform_or_authority_resources():
    files = [path for path in artifacts("*") if path.is_file()]
    tracked_text = "\n".join(
        path.read_text() for path in files if path.suffix in {".tf", ".hcl", ".md"}
    )

    for forbidden in (
        'resource "azurerm_role_assignment"',
        'resource "azurerm_user_assigned_identity"',
        'resource "azurerm_container_registry"',
        'resource "azurerm_container_app_environment"',
        'resource "azurerm_resource_group"',
        "subscription_id",
    ):
        assert forbidden not in tracked_text

    assert not UUID.search(tracked_text)
    assert not artifacts("*.tfstate")
    assert not artifacts("*.tfplan")
