FROM python:3.14.6-slim-bookworm@sha256:4c92ffcde4dd6f1ff72a24518f49fd4990b27134987dfa31a733badde66df9f8

# The release passes the commit SHA so a replica can report its own build.
ARG SERVICE_VERSION=0.0.0-local

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    SERVICE_VERSION=${SERVICE_VERSION}

WORKDIR /app

RUN apt-get update \
    && DEBIAN_FRONTEND=noninteractive \
       apt-get install --yes --no-install-recommends tzdata \
    && rm -rf /var/lib/apt/lists/*

COPY app/requirements.txt ./app/requirements.txt

RUN pip install --no-cache-dir --disable-pip-version-check \
    -r app/requirements.txt

RUN groupadd --gid 10001 appuser \
    && useradd --uid 10001 --gid 10001 --no-create-home \
       --home-dir /nonexistent --shell /usr/sbin/nologin appuser

COPY --chown=10001:10001 app ./app

USER 10001:10001

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8080/health', timeout=2).close()" || exit 1

CMD ["uvicorn", "app.src.main:app", "--host", "0.0.0.0", "--port", "8080"]
