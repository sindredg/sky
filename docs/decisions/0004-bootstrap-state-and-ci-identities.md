# 0004: Separate state, plan, and deployment authority

Status: accepted

Terraform state uses a dedicated Azure Blob container created by a human-applied
bootstrap root. The same root owns GitHub workload identities and all role
assignments. Application pipelines cannot widen their own permissions.

Pull-request plans and production deployments use separate user-assigned managed
identities. The plan identity has Reader at subscription scope. The deploy
identity has Contributor at subscription scope because the platform stack must
create resource groups. Both receive Storage Blob Data Contributor only on the
state container.

User-assigned managed identities were chosen over Entra app registrations. The
workloads need Azure resource access only, so managed identities avoid a second
provider and directory-level application permissions.

The backend disables shared keys and uses Entra authentication. Blob versioning,
30-day soft delete, and a CanNotDelete lock protect recovery. Public network
access remains enabled because GitHub-hosted runners need the Blob endpoint.

The deployment identity cannot create role assignments. New application
identities and registry grants are added through a later human-reviewed
bootstrap change.
