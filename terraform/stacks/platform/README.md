# Platform stack

This root creates the production resource group, container registry, Log
Analytics workspace, and Container Apps environment. It does not create the
application, identities, role assignments, or networking.

Initialize and validate locally:

    terraform init -backend=false -input=false
    terraform fmt -check
    terraform validate

After the first human-applied bootstrap stage exists, initialize the remote
backend with `backend.hcl` and pass
`../../environments/production/platform.tfvars` to the plan command. A real
plan and any apply require the owner's exact approval. Follow the complete
fresh deployment order in `../../bootstrap/README.md`.
