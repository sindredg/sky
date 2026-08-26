import json
import threading
from contextlib import contextmanager
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.error import HTTPError

import pytest

from scripts.deployment_smoke import (
    SmokeCheckError,
    check_deployment,
    fetch_text,
    main,
)


class DeploymentHandler(BaseHTTPRequestHandler):
    health_failures = 0
    health_requests = 0
    version = "abc123"
    include_lofoten = True

    def do_GET(self):
        if self.path == "/health":
            type(self).health_requests += 1
            if type(self).health_requests <= type(self).health_failures:
                self.send_response(503)
                self.end_headers()
                return
            self.respond(200, "text/plain", b"healthy\n")
            return
        if self.path == "/version":
            body = json.dumps(
                {"service": "golden-hour", "version": type(self).version}
            ).encode()
            self.respond(200, "application/json", body)
            return
        if self.path == "/":
            self.respond(200, "text/html", b"<title>Golden Hour</title>")
            return
        if self.path == "/api/places":
            places = [{"slug": "lofoten"}] if type(self).include_lofoten else []
            body = json.dumps({"places": places}).encode()
            self.respond(200, "application/json", body)
            return
        self.send_response(404)
        self.end_headers()

    def log_message(self, format, *args):
        pass

    def respond(self, status, content_type, body):
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


@contextmanager
def deployment_server(*, health_failures=0, version="abc123", include_lofoten=True):
    class Handler(DeploymentHandler):
        pass

    Handler.health_failures = health_failures
    Handler.health_requests = 0
    Handler.version = version
    Handler.include_lofoten = include_lofoten
    server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    thread = threading.Thread(target=server.serve_forever)
    thread.start()
    try:
        host, port = server.server_address
        yield f"http://{host}:{port}", Handler
    finally:
        server.shutdown()
        server.server_close()
        thread.join()


def test_failed_http_response_is_closed():
    with (
        deployment_server(health_failures=1) as (base_url, _),
        pytest.raises(HTTPError) as error,
    ):
        fetch_text(f"{base_url}/health", timeout_seconds=1)

    assert error.value.closed


def test_live_contract_passes_for_expected_deployment():
    with deployment_server() as (base_url, _):
        check_deployment(
            base_url,
            "abc123",
            attempts=1,
            delay_seconds=0,
            timeout_seconds=1,
        )


def test_cold_start_is_retried_before_the_contract_is_checked():
    with deployment_server(health_failures=1) as (base_url, handler):
        check_deployment(
            base_url,
            "abc123",
            attempts=2,
            delay_seconds=0,
            timeout_seconds=1,
        )

    assert handler.health_requests == 2


def test_wrong_revision_fails_with_both_versions():
    with (
        deployment_server(version="old456") as (base_url, _),
        pytest.raises(SmokeCheckError) as error,
    ):
        check_deployment(
            base_url,
            "abc123",
            attempts=1,
            delay_seconds=0,
            timeout_seconds=1,
        )

    assert "expected abc123" in str(error.value)
    assert "received old456" in str(error.value)


def test_missing_representative_place_fails_the_api_contract():
    with (
        deployment_server(include_lofoten=False) as (base_url, _),
        pytest.raises(SmokeCheckError, match="lofoten"),
    ):
        check_deployment(
            base_url,
            "abc123",
            attempts=1,
            delay_seconds=0,
            timeout_seconds=1,
        )


def test_command_reports_the_verified_revision(capsys):
    with deployment_server() as (base_url, _):
        status = main(
            [
                base_url,
                "abc123",
                "--attempts",
                "1",
                "--delay-seconds",
                "0",
                "--timeout-seconds",
                "1",
            ]
        )

    assert status == 0
    assert capsys.readouterr().out == "deployment smoke passed for abc123\n"
