import re
from pathlib import Path

ROOT = Path(__file__).parents[2]
BOOTSTRAP = ROOT / "terraform" / "bootstrap"
UUID = re.compile(
    r"\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-"
    r"[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\b"
)


def artifacts(pattern: str) -> list[Path]:
    # .terraform holds Terraform's own working files, gitignored and never tracked.
    return [path for path in BOOTSTRAP.rglob(pattern) if ".terraform" not in path.parts]


def read(name: str) -> str:
    return (BOOTSTRAP / name).read_text()


def test_backend_uses_a_locked_azure_provider_and_entra_authentication():
    versions = read("versions.tf")
    backend = read("backend.hcl")
    providers = read("providers.tf")

    assert 'required_version = ">= 1.15.0, < 2.0.0"' in versions
    assert 'version = "~> 5.0"' in versions
    assert 'backend "azurerm" {}' in versions
    assert "use_azuread_auth = true" in backend
    assert "use_cli          = true" in backend
    assert "storage_use_azuread = true" in providers


def test_state_storage_disables_keys_and_keeps_recovery_controls():
    main = read("main.tf")

    for expected in (
        "shared_access_key_enabled         = false",
        "default_to_oauth_authentication   = true",
        "allow_nested_items_to_be_public   = false",
        "versioning_enabled = true",
        "days = local.config.state_retention_days",
        'container_access_type = "private"',
        'lock_level = "CanNotDelete"',
        "scope                = azurerm_storage_container.state.id",
    ):
        assert expected in main


def test_plan_and_deploy_identities_have_different_fixed_permissions():
    identities = read("identities.tf")
    locals_tf = read("locals.tf")

    assert 'azurerm_user_assigned_identity" "plan"' in identities
    assert 'azurerm_user_assigned_identity" "deploy"' in identities
    assert re.search(r'role_definition_name\s*=\s*"Reader"', identities)
    assert re.search(r'role_definition_name\s*=\s*"Contributor"', identities)
    assert (
        len(
            re.findall(
                r'role_definition_name\s*=\s*"Storage Blob Data Contributor"',
                identities,
            )
        )
        == 2
    )
    assert (
        identities.count(
            "scope                            = azurerm_storage_container.state.id"
        )
        == 2
    )
    assert (
        'subject                   = "${local.config.github_subject_prefix}:pull_request"'
        in identities
    )
    assert (
        'subject                   = "${local.config.github_subject_prefix}:environment:${var.deploy_environment}"'
        in identities
    )
    assert "repo:${var.github_owner}@${var.github_owner_id}/" in locals_tf
    assert "/${var.github_repository}@${var.github_repository_id}" in locals_tf
    assert not re.search(r'role_definition_name\s*=\s*"Owner"', identities)
    assert not re.search(
        r'role_definition_name\s*=\s*"User Access Administrator"', identities
    )


def test_the_pull_identity_is_scoped_to_the_registry_only():
    identities = read("identities.tf")

    assert 'resource "azurerm_user_assigned_identity" "pull"' in identities
    assert 'role_definition_name             = "AcrPull"' in identities
    assert (
        "scope                            = data.azurerm_container_registry.platform[0].id"
        in identities
    )


def grant(name: str) -> str:
    found = re.search(
        r'resource "azurerm_role_assignment" "' + name + r'" \{(.*?)\n\}',
        read("identities.tf"),
        re.S,
    )
    assert found, name
    return found.group(1)


def test_the_pull_identity_cannot_push_or_delete_images():
    block = grant("pull_registry")

    assert '"AcrPull"' in block
    for forbidden in ("AcrPush", "AcrDelete", "AcrImageSigner"):
        assert forbidden not in block


def test_the_push_identity_reaches_the_registry_and_nothing_else():
    identities = read("identities.tf")
    block = grant("push_registry")

    assert 'resource "azurerm_user_assigned_identity" "push"' in identities
    assert '"AcrPush"' in block
    assert "data.azurerm_container_registry.platform[0].id" in block
    assert "data.azurerm_subscription.current.id" not in block


def test_the_push_identity_is_trusted_on_the_branch_not_the_environment():
    identities = read("identities.tf")

    # An environment subject would put the build behind the deployment gate.
    assert (
        'subject                   = "${local.config.github_subject_prefix}:ref:refs/heads/main"'
        in identities
    )
    assert "azurerm_user_assigned_identity.push.id" in identities


def test_the_registry_is_resolved_by_name_not_by_a_hardcoded_id():
    identities = read("identities.tf")
    variables = read("variables.tf")

    # A literal registry ID would carry the subscription ID into a tracked file.
    assert 'data "azurerm_container_registry" "platform"' in identities
    assert "var.container_registry_name" in identities
    assert "var.platform_resource_group_name" in identities
    assert 'variable "container_registry_name"' in variables
    assert 'variable "platform_resource_group_name"' in variables


def test_registry_bindings_can_wait_for_the_platform_without_state_churn():
    identities = read("identities.tf")
    variables = read("variables.tf")

    assert 'variable "enable_registry_role_assignments"' in variables
    assert "default     = true" in variables
    assert identities.count("var.enable_registry_role_assignments ? 1 : 0") == 3
    for name in ("pull_registry", "push_registry"):
        assert f"from = azurerm_role_assignment.{name}" in identities
        assert f"to   = azurerm_role_assignment.{name}[0]" in identities


def test_fresh_deployment_documents_both_bootstrap_stages_in_order():
    readme = read("README.md")

    foundation = readme.index("-var=enable_registry_role_assignments=false")
    platform = readme.index("gh workflow run deploy.yml")
    bindings = readme.index("-var=enable_registry_role_assignments=true")

    assert foundation < platform < bindings


def test_fresh_deployment_starts_with_a_local_backend_override():
    override = read("bootstrap_override.tf.example")
    readme = read("README.md")

    assert 'backend "local" {}' in override
    assert "cp bootstrap_override.tf.example bootstrap_override.tf" in readme
    assert "rm bootstrap_override.tf" in readme
    assert "terraform init -migrate-state -backend-config=backend.hcl" in readme


def test_tracked_bootstrap_has_no_subscription_uuid_or_runtime_artifact():
    files = [path for path in artifacts("*") if path.is_file()]
    tracked_text = "\n".join(
        path.read_text() for path in files if path.suffix in {".tf", ".hcl", ".md"}
    )

    assert not UUID.search(tracked_text)
    assert not artifacts("*.tfstate")
    assert not artifacts("*.tfplan")
