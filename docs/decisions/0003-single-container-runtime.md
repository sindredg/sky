# 0003: Serve the website and API from one container

Status: accepted

Golden Hour uses one FastAPI container for the static website and its internal
calculation endpoints. The application has no database, queue, external API, or
frontend build that needs an independent scaling or trust boundary.

The image pins Python 3.12.14 by digest, installs system timezone data, runs as
UID and GID 10001, and exposes one healthchecked port. Docker Compose adds a
read-only filesystem, a writable in-memory temporary directory, dropped Linux
capabilities, and no-new-privileges for local runs.

A separate web container was rejected because FastAPI already serves the static
assets. It would add a proxy, another image, and more configuration without
isolating a real concern. Buildpacks were rejected because the base image,
timezone data, user, and health contract should stay visible and reproducible.

The same image is built once and later deployed to Azure Container Apps by
digest.
