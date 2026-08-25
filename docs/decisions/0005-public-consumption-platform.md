# 0005: Start with a public Consumption platform

Status: accepted

The first production platform uses a workload-profiles Container Apps
environment with its built-in Consumption profile. It has no VNet. Golden Hour
is a public stateless service with no private dependency, so a VNet would add
cost and prevent a GitHub-hosted runner from reaching the app for a smoke test.

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
