# 0005: Start with a public Consumption platform

Status: accepted

The first production platform uses a workload-profiles Container Apps
environment with its built-in Consumption profile. It has no VNet. Golden Hour
is a public stateless service with no private dependency, so a VNet would add
cost and prevent a GitHub-hosted runner from reaching the app for a smoke test.

The workload profile is declared explicitly. An environment created without one
is the legacy Consumption-only type, which cannot gain profiles later and must
be destroyed and recreated, taking the container app and its public hostname
with it. The Consumption profile costs nothing while no app runs on it, so the
declaration buys the upgrade path for free. Do not remove the block as
redundant.

The platform state owns the production resource group, Standard container
registry, 30-day Log Analytics workspace, and Container Apps environment. The
application and its ingress stay in a separate release state.

The registry endpoint is public because hosted runners push the image. Its
admin account and anonymous pull are disabled. A later human-applied bootstrap
change will grant a dedicated image-pull identity `AcrPull` on this registry
only. The pipeline cannot create that identity or grant itself access.

A VNet becomes justified when the app gains a private dependency, controlled
egress, private ingress, or an in-network runner. Premium ACR becomes justified
by private endpoints, geo-replication, or measured throughput needs.
