"""Properties that hold across every Terraform root.

These replace per-root assertions that copied a value out of the file beside
them. A copy fails when someone makes a deliberate change; a property fails when
something is actually wrong.
"""

import re
from pathlib import Path

ROOT = Path(__file__).parents[2]
ROOTS = {
    "bootstrap": ROOT / "terraform" / "bootstrap",
    "platform": ROOT / "terraform" / "stacks" / "platform",
    "application": ROOT / "terraform" / "stacks" / "application",
}


def backend_key(root: Path) -> str:
    found = re.search(r'^key\s*=\s*"([^"]+)"', (root / "backend.hcl").read_text(), re.M)
    assert found, f"{root.name} declares no backend key"
    return found.group(1)


def test_every_root_stores_its_state_under_a_distinct_key():
    keys = {name: backend_key(path) for name, path in ROOTS.items()}

    # Two roots sharing a key would have each apply overwrite the other's state.
    assert len(set(keys.values())) == len(keys), keys


def test_every_root_pins_the_same_provider_and_terraform_range():
    versions = {
        name: (path / "versions.tf").read_text() for name, path in ROOTS.items()
    }

    required = {
        name: re.search(r'required_version\s*=\s*"([^"]+)"', text).group(1)
        for name, text in versions.items()
    }
    provider = {
        name: re.search(r'version\s*=\s*"(~>[^"]+)"', text).group(1)
        for name, text in versions.items()
    }

    # A root drifting onto another provider major is the failure worth catching,
    # not the particular version anyone chose.
    assert len(set(required.values())) == 1, required
    assert len(set(provider.values())) == 1, provider


def test_every_root_authenticates_to_state_through_entra():
    for name, path in ROOTS.items():
        backend = (path / "backend.hcl").read_text()
        providers = (path / "providers.tf").read_text()

        assert "use_azuread_auth = true" in backend, name
        assert "storage_use_azuread = true" in providers, name


def test_only_the_human_applied_root_may_use_a_local_login():
    # A pipeline root falling back to Azure CLI auth would mean a credential
    # on the runner rather than a federated token.
    assert "use_cli" in (ROOTS["bootstrap"] / "backend.hcl").read_text()

    for name in ("platform", "application"):
        assert "use_cli" not in (ROOTS[name] / "backend.hcl").read_text(), name


def test_the_application_only_consumes_outputs_the_platform_exports():
    platform_outputs = set(
        re.findall(
            r'^output\s+"([^"]+)"', (ROOTS["platform"] / "outputs.tf").read_text(), re.M
        )
    )
    application = (ROOTS["application"] / "main.tf").read_text()

    consumed = set(
        re.findall(
            r"data\.terraform_remote_state\.platform\.outputs\.(\w+)", application
        )
    )

    assert consumed, "the application reads no platform output"
    # Renaming a platform output silently breaks the application at apply time.
    assert consumed <= platform_outputs, consumed - platform_outputs


def test_no_root_carries_a_subscription_id_or_state_file():
    uuid = re.compile(
        r"\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-"
        r"[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\b"
    )

    for name, path in ROOTS.items():
        files = [
            p for p in path.rglob("*") if p.is_file() and ".terraform" not in p.parts
        ]
        text = "\n".join(
            p.read_text() for p in files if p.suffix in {".tf", ".hcl", ".md"}
        )

        assert not uuid.search(text), name
        assert "subscription_id" not in text, name
        assert not [p for p in files if p.suffix in {".tfstate", ".tfplan"}], name
