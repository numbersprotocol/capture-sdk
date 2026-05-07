"""
Unit tests for retry logic, timeout configuration, and rate limiting.
"""

from __future__ import annotations

import time
from unittest.mock import patch

import httpx
import pytest
import respx
from httpx import Response

from numbersprotocol_capture import Capture
from numbersprotocol_capture.client import (
    ASSET_SEARCH_API_URL,
    DEFAULT_MAX_RETRIES,
    DEFAULT_RETRY_DELAY,
    DEFAULT_TIMEOUT,
)
from numbersprotocol_capture.types import CaptureOptions

TEST_NID = "bafybeif3mhxhkhfwuszl2lybtai3hz3q6naqpfisd4q55mcc7opkmiv5ei"

SEARCH_OK_RESPONSE = {
    "precise_match": "",
    "input_file_mime_type": "image/png",
    "similar_matches": [],
    "order_id": "order_123",
}


class TestDefaultConfiguration:
    """Tests for default values of new configuration options."""

    def test_default_timeout(self) -> None:
        """Capture client uses 30s timeout by default."""
        with Capture(token="test-token") as capture:
            assert capture._timeout == DEFAULT_TIMEOUT
            assert capture._timeout == 30.0

    def test_default_max_retries(self) -> None:
        """Capture client uses 3 max retries by default."""
        with Capture(token="test-token") as capture:
            assert capture._max_retries == DEFAULT_MAX_RETRIES
            assert capture._max_retries == 3

    def test_default_retry_delay(self) -> None:
        """Capture client uses 1.0s retry delay by default."""
        with Capture(token="test-token") as capture:
            assert capture._retry_delay == DEFAULT_RETRY_DELAY
            assert capture._retry_delay == 1.0

    def test_default_rate_limit_none(self) -> None:
        """No rate limiting by default."""
        with Capture(token="test-token") as capture:
            assert capture._rate_limit is None

    def test_custom_timeout_via_init(self) -> None:
        """Custom timeout is respected."""
        with Capture(token="test-token", timeout=60.0) as capture:
            assert capture._timeout == 60.0

    def test_custom_max_retries_via_init(self) -> None:
        """Custom max_retries is respected."""
        with Capture(token="test-token", max_retries=5) as capture:
            assert capture._max_retries == 5

    def test_custom_retry_delay_via_init(self) -> None:
        """Custom retry_delay is respected."""
        with Capture(token="test-token", retry_delay=2.0) as capture:
            assert capture._retry_delay == 2.0

    def test_custom_rate_limit_via_init(self) -> None:
        """Custom rate_limit is respected."""
        with Capture(token="test-token", rate_limit=10) as capture:
            assert capture._rate_limit == 10

    def test_options_object_passes_new_fields(self) -> None:
        """CaptureOptions dataclass fields are passed to the client."""
        opts = CaptureOptions(
            token="test-token",
            timeout=45.0,
            max_retries=2,
            retry_delay=0.5,
            rate_limit=5,
        )
        with Capture(options=opts) as capture:
            assert capture._timeout == 45.0
            assert capture._max_retries == 2
            assert capture._retry_delay == 0.5
            assert capture._rate_limit == 5


class TestRetryLogic:
    """Tests for retry logic on transient failures."""

    @respx.mock
    def test_retries_on_503(self) -> None:
        """Client retries on 503 Service Unavailable."""
        with Capture(token="test-token", max_retries=3, retry_delay=0.0) as capture:
            respx.post(ASSET_SEARCH_API_URL).mock(
                side_effect=[
                    Response(503),
                    Response(200, json=SEARCH_OK_RESPONSE),
                ]
            )
            result = capture.search_asset(nid=TEST_NID)
            assert result.order_id == "order_123"

    @respx.mock
    def test_retries_on_502(self) -> None:
        """Client retries on 502 Bad Gateway."""
        with Capture(token="test-token", max_retries=3, retry_delay=0.0) as capture:
            respx.post(ASSET_SEARCH_API_URL).mock(
                side_effect=[
                    Response(502),
                    Response(200, json=SEARCH_OK_RESPONSE),
                ]
            )
            result = capture.search_asset(nid=TEST_NID)
            assert result.order_id == "order_123"

    @respx.mock
    def test_retries_on_429(self) -> None:
        """Client retries on 429 Too Many Requests."""
        with Capture(token="test-token", max_retries=3, retry_delay=0.0) as capture:
            respx.post(ASSET_SEARCH_API_URL).mock(
                side_effect=[
                    Response(429),
                    Response(200, json=SEARCH_OK_RESPONSE),
                ]
            )
            result = capture.search_asset(nid=TEST_NID)
            assert result.order_id == "order_123"

    @respx.mock
    def test_retries_on_500(self) -> None:
        """Client retries on 500 Internal Server Error."""
        with Capture(token="test-token", max_retries=3, retry_delay=0.0) as capture:
            respx.post(ASSET_SEARCH_API_URL).mock(
                side_effect=[
                    Response(500),
                    Response(200, json=SEARCH_OK_RESPONSE),
                ]
            )
            result = capture.search_asset(nid=TEST_NID)
            assert result.order_id == "order_123"

    @respx.mock
    def test_retries_on_504(self) -> None:
        """Client retries on 504 Gateway Timeout."""
        with Capture(token="test-token", max_retries=3, retry_delay=0.0) as capture:
            respx.post(ASSET_SEARCH_API_URL).mock(
                side_effect=[
                    Response(504),
                    Response(200, json=SEARCH_OK_RESPONSE),
                ]
            )
            result = capture.search_asset(nid=TEST_NID)
            assert result.order_id == "order_123"

    @respx.mock
    def test_does_not_retry_on_400(self) -> None:
        """Client does NOT retry on 400 Bad Request."""
        call_count = 0

        def side_effect(request: httpx.Request) -> Response:
            nonlocal call_count
            call_count += 1
            return Response(400, json={"detail": "bad request"})

        with Capture(token="test-token", max_retries=3, retry_delay=0.0) as capture:
            respx.post(ASSET_SEARCH_API_URL).mock(side_effect=side_effect)
            with pytest.raises(Exception):
                capture.search_asset(nid=TEST_NID)

        assert call_count == 1

    @respx.mock
    def test_does_not_retry_on_404(self) -> None:
        """Client does NOT retry on 404 Not Found."""
        call_count = 0

        def side_effect(request: httpx.Request) -> Response:
            nonlocal call_count
            call_count += 1
            return Response(404, json={"detail": "not found"})

        with Capture(token="test-token", max_retries=3, retry_delay=0.0) as capture:
            respx.post(ASSET_SEARCH_API_URL).mock(side_effect=side_effect)
            with pytest.raises(Exception):
                capture.search_asset(nid=TEST_NID)

        assert call_count == 1

    @respx.mock
    def test_exhausts_retries_and_raises(self) -> None:
        """Client raises error after exhausting all retries."""
        with Capture(token="test-token", max_retries=2, retry_delay=0.0) as capture:
            respx.post(ASSET_SEARCH_API_URL).mock(
                side_effect=[Response(503), Response(503), Response(503)]
            )
            with pytest.raises(Exception):
                capture.search_asset(nid=TEST_NID)

    @respx.mock
    def test_max_retries_zero_does_not_retry(self) -> None:
        """max_retries=0 means no retry attempts."""
        call_count = 0

        def side_effect(request: httpx.Request) -> Response:
            nonlocal call_count
            call_count += 1
            return Response(503)

        with Capture(token="test-token", max_retries=0) as capture:
            respx.post(ASSET_SEARCH_API_URL).mock(side_effect=side_effect)
            with pytest.raises(Exception):
                capture.search_asset(nid=TEST_NID)

        assert call_count == 1

    def test_retries_on_network_error(self) -> None:
        """Client retries on network (connection) errors."""
        call_count = 0

        def mock_request(*args, **kwargs):  # type: ignore[no-untyped-def]
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                raise httpx.ConnectError("Connection refused")
            # Return a mock response object
            resp = Response(200, json=SEARCH_OK_RESPONSE)
            return resp

        with Capture(token="test-token", max_retries=2, retry_delay=0.0) as capture:
            with patch.object(capture._client, "post", side_effect=mock_request):
                result = capture.search_asset(nid=TEST_NID)

        assert call_count == 2
        assert result.order_id == "order_123"


class TestRateLimiting:
    """Tests for client-side rate limiting."""

    @respx.mock
    def test_rate_limit_none_allows_all_requests(self) -> None:
        """Without rate_limit, requests pass through immediately."""
        respx.post(ASSET_SEARCH_API_URL).mock(
            return_value=Response(200, json=SEARCH_OK_RESPONSE)
        )

        with Capture(token="test-token") as capture:
            for _ in range(5):
                result = capture.search_asset(nid=TEST_NID)
                assert result.order_id == "order_123"

    @respx.mock
    def test_rate_limit_token_bucket_starts_full(self) -> None:
        """Token bucket starts full - first N requests within rate_limit pass immediately."""
        respx.post(ASSET_SEARCH_API_URL).mock(
            return_value=Response(200, json=SEARCH_OK_RESPONSE)
        )

        rate_limit = 5
        start = time.monotonic()

        with Capture(token="test-token", rate_limit=rate_limit) as capture:
            # First 5 requests (bucket starts full) should be fast
            for _ in range(rate_limit):
                capture.search_asset(nid=TEST_NID)

        elapsed = time.monotonic() - start
        # Should be fast since bucket starts full
        assert elapsed < 1.0, f"Expected < 1.0s for burst, got {elapsed:.2f}s"
