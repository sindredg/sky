# Application stack

The container app, its ingress and its scaling. Everything a release touches
and nothing else.

Applied by the pipeline through the deployment identity. It reads the platform
stack's outputs for the environment and registry, and resolves the image pull
identity by name from the bootstrap root.

On a fresh deployment, run this only after the second bootstrap stage has
granted `AcrPull` and `AcrPush` on the platform registry.

## The image is always a digest

`image_digest` has no default and is validated against
`^sha256:[0-9a-f]{64}$`. A tag can be moved to point at a different artifact,
so a tag cannot prove that two environments run the same build. A digest can.

The release workflow resolves the digest and passes it in. There is no path
that deploys a tag.

## Health probes

The Dockerfile declares a `HEALTHCHECK`. Container Apps ignores it entirely,
so the liveness and readiness probes here repeat that contract against
`/health` on port 8080.

## Scaling

`min_replicas` is 0, so the app costs nothing while idle and pays a cold start
on the first request afterwards. Raising it to 1 removes the cold start and
bills continuously.
