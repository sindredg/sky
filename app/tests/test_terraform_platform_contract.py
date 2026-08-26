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


def test_platform_resources_match_public_consumption_boundary():
    main = read("main.tf")

    assert re.search(r"admin_enabled\s*=\s*false", main)
    assert re.search(r"anonymous_pull_enabled\s*=\s*false", main)
    assert re.search(r"public_network_access_enabled\s*=\s*true", main)
    assert "log_analytics_workspace_id" in main
    assert re.search(r'logs_destination\s*=\s*"log-analytics"', main)


def test_platform_outputs_expose_only_application_inputs():
    outputs = read("outputs.tf")

    assert 'output "resource_group"' in outputs
    assert 'output "container_registry"' in outputs
    assert 'output "container_app_environment"' in outputs


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
