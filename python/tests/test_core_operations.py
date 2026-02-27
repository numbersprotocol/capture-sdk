"""
Unit tests for core SDK operations: register, update, get, get_history, search_nft,
and _normalize_file edge cases.

These tests verify request construction, response parsing, and error handling
using mocked HTTP responses via respx.
"""

from pathlib import Path

import pytest
import respx
from httpx import Response

from numbersprotocol_capture import Capture
from numbersprotocol_capture.client import _normalize_file
from numbersprotocol_capture.errors import (
    AuthenticationError,
    NotFoundError,
    NetworkError,
    ValidationError,
)
from numbersprotocol_capture.types import Asset, Commit, NftRecord

# Test asset NID
TEST_NID = "bafybeif3mhxhkhfwuszl2lybtai3hz3q6naqpfisd4q55mcc7opkmiv5ei"

# Mock API URLs
BASE_URL = "https://api.numbersprotocol.io/api/v3"
ASSETS_URL = f"{BASE_URL}/assets/"
ASSET_URL = f"{BASE_URL}/assets/{TEST_NID}/"
HISTORY_API_URL = "https://e23hi68y55.execute-api.us-east-1.amazonaws.com/default/get-commits-storage-backend-jade-near"
NFT_SEARCH_API_URL = "https://eofveg1f59hrbn.m.pipedream.net"

# Shared mock asset API response
MOCK_ASSET_RESPONSE = {
    "id": TEST_NID,
    "asset_file_name": "test.png",
    "asset_file_mime_type": "image/png",
    "caption": "Test caption",
    "headline": "Test headline",
}

MOCK_HISTORY_RESPONSE = {
    "nid": TEST_NID,
    "commits": [
        {
            "assetTreeCid": "bafyreif123",
            "txHash": "0xabc123",
            "author": "0x1234",
            "committer": "0x1234",
            "timestampCreated": 1700000000,
            "action": "create",
        }
    ],
}


@pytest.fixture
def capture_client():
    """Create a Capture client with test token."""
    with Capture(token="test-token") as client:
        yield client


# ---------------------------------------------------------------------------
# register()
# ---------------------------------------------------------------------------


class TestRegister:
    """Tests for register() request construction and response parsing."""

    @respx.mock
    def test_register_posts_to_assets_endpoint(self, capture_client):
        """Verify register() POSTs to the correct endpoint."""
        route = respx.post(ASSETS_URL).mock(
            return_value=Response(201, json=MOCK_ASSET_RESPONSE)
        )

        capture_client.register(b"test content", filename="test.png")

        assert route.called
        assert route.call_count == 1

    @respx.mock
    def test_register_sends_authorization_header(self):
        """Verify Authorization header is set correctly."""
        route = respx.post(ASSETS_URL).mock(
            return_value=Response(201, json=MOCK_ASSET_RESPONSE)
        )

        with Capture(token="my-secret-token") as capture:
            capture.register(b"test content", filename="test.png")

        request = route.calls[0].request
        assert request.headers["Authorization"] == "token my-secret-token"

    @respx.mock
    def test_register_includes_asset_file_in_multipart(self, capture_client):
        """Verify asset_file is included in multipart form data."""
        route = respx.post(ASSETS_URL).mock(
            return_value=Response(201, json=MOCK_ASSET_RESPONSE)
        )

        capture_client.register(b"image data", filename="photo.png")

        request = route.calls[0].request
        content_type = request.headers.get("content-type", "")
        assert "multipart/form-data" in content_type
        body = request.content.decode("latin-1")
        assert "asset_file" in body
        assert "photo.png" in body

    @respx.mock
    def test_register_includes_caption_and_headline(self, capture_client):
        """Verify caption and headline are sent in the form data."""
        route = respx.post(ASSETS_URL).mock(
            return_value=Response(201, json=MOCK_ASSET_RESPONSE)
        )

        capture_client.register(
            b"image data",
            filename="photo.png",
            caption="My caption",
            headline="My title",
        )

        request = route.calls[0].request
        body = request.content.decode("latin-1")
        assert "My caption" in body
        assert "My title" in body

    @respx.mock
    def test_register_sets_public_access_true_by_default(self, capture_client):
        """Verify public_access defaults to true."""
        route = respx.post(ASSETS_URL).mock(
            return_value=Response(201, json=MOCK_ASSET_RESPONSE)
        )

        capture_client.register(b"image data", filename="photo.png")

        request = route.calls[0].request
        body = request.content.decode("latin-1")
        assert "true" in body

    @respx.mock
    def test_register_parses_asset_response(self, capture_client):
        """Verify register() correctly parses the API response."""
        respx.post(ASSETS_URL).mock(
            return_value=Response(201, json=MOCK_ASSET_RESPONSE)
        )

        asset = capture_client.register(b"image data", filename="photo.png")

        assert asset.nid == TEST_NID
        assert asset.filename == "test.png"
        assert asset.mime_type == "image/png"
        assert asset.caption == "Test caption"
        assert asset.headline == "Test headline"

    @respx.mock
    def test_register_with_path_object(self, tmp_path, capture_client):
        """Verify register() accepts a Path object."""
        test_file = tmp_path / "image.png"
        test_file.write_bytes(b"fake png data")

        respx.post(ASSETS_URL).mock(
            return_value=Response(201, json=MOCK_ASSET_RESPONSE)
        )

        asset = capture_client.register(test_file)
        assert asset.nid == TEST_NID

    @respx.mock
    def test_register_raises_authentication_error_on_401(self, capture_client):
        """Verify AuthenticationError is raised on 401 response."""
        respx.post(ASSETS_URL).mock(return_value=Response(401, json={"detail": "Unauthorized"}))

        with pytest.raises(AuthenticationError):
            capture_client.register(b"image data", filename="photo.png")

    @respx.mock
    def test_register_raises_validation_error_on_empty_file(self, capture_client):
        """Verify ValidationError is raised for empty file content."""
        with pytest.raises(ValidationError, match="file cannot be empty"):
            capture_client.register(b"", filename="empty.png")

    def test_register_raises_validation_error_for_headline_too_long(self, capture_client):
        """Verify ValidationError is raised for headline over 25 characters."""
        with pytest.raises(ValidationError, match="headline must be 25 characters or less"):
            capture_client.register(b"data", filename="test.png", headline="a" * 26)

    def test_register_raises_validation_error_for_bytes_without_filename(self, capture_client):
        """Verify ValidationError is raised for bytes input without filename."""
        with pytest.raises(ValidationError, match="filename is required"):
            capture_client.register(b"data")


# ---------------------------------------------------------------------------
# update()
# ---------------------------------------------------------------------------


class TestUpdate:
    """Tests for update() request construction and response parsing."""

    @respx.mock
    def test_update_patches_correct_endpoint(self, capture_client):
        """Verify update() sends PATCH to the correct URL."""
        route = respx.patch(ASSET_URL).mock(
            return_value=Response(200, json=MOCK_ASSET_RESPONSE)
        )

        capture_client.update(TEST_NID, caption="Updated caption")

        assert route.called
        request = route.calls[0].request
        assert request.method == "PATCH"

    @respx.mock
    def test_update_sends_authorization_header(self):
        """Verify Authorization header is set correctly."""
        route = respx.patch(ASSET_URL).mock(
            return_value=Response(200, json=MOCK_ASSET_RESPONSE)
        )

        with Capture(token="update-token") as capture:
            capture.update(TEST_NID, caption="test")

        request = route.calls[0].request
        assert request.headers["Authorization"] == "token update-token"

    @respx.mock
    def test_update_sends_caption_in_form_data(self, capture_client):
        """Verify caption is included in the PATCH request."""
        from urllib.parse import unquote_plus

        route = respx.patch(ASSET_URL).mock(
            return_value=Response(200, json=MOCK_ASSET_RESPONSE)
        )

        capture_client.update(TEST_NID, caption="New caption")

        request = route.calls[0].request
        body = unquote_plus(request.content.decode("utf-8"))
        assert "New caption" in body

    @respx.mock
    def test_update_sends_headline_and_commit_message(self, capture_client):
        """Verify headline and commit_message are sent."""
        from urllib.parse import unquote_plus

        route = respx.patch(ASSET_URL).mock(
            return_value=Response(200, json=MOCK_ASSET_RESPONSE)
        )

        capture_client.update(
            TEST_NID,
            headline="New title",
            commit_message="Fixed typo",
        )

        request = route.calls[0].request
        body = unquote_plus(request.content.decode("utf-8"))
        assert "New title" in body
        assert "Fixed typo" in body

    @respx.mock
    def test_update_serializes_custom_metadata_as_json(self, capture_client):
        """Verify custom_metadata is serialized to JSON in nit_commit_custom field."""
        route = respx.patch(ASSET_URL).mock(
            return_value=Response(200, json=MOCK_ASSET_RESPONSE)
        )

        capture_client.update(
            TEST_NID,
            custom_metadata={"source": "camera", "location": "Taiwan"},
        )

        request = route.calls[0].request
        body = request.content.decode("utf-8")
        assert "nit_commit_custom" in body
        assert "camera" in body
        assert "Taiwan" in body

    @respx.mock
    def test_update_parses_asset_response(self, capture_client):
        """Verify update() correctly parses the API response."""
        updated_response = {**MOCK_ASSET_RESPONSE, "caption": "Updated caption"}
        respx.patch(ASSET_URL).mock(return_value=Response(200, json=updated_response))

        asset = capture_client.update(TEST_NID, caption="Updated caption")

        assert asset.nid == TEST_NID
        assert asset.caption == "Updated caption"

    def test_update_raises_validation_error_for_empty_nid(self, capture_client):
        """Verify ValidationError is raised for empty NID."""
        with pytest.raises(ValidationError, match="nid is required"):
            capture_client.update("", caption="test")

    def test_update_raises_validation_error_for_long_headline(self, capture_client):
        """Verify ValidationError is raised for headline over 25 characters."""
        with pytest.raises(ValidationError, match="headline must be 25 characters or less"):
            capture_client.update(TEST_NID, headline="a" * 26)

    @respx.mock
    def test_update_raises_not_found_error_on_404(self, capture_client):
        """Verify NotFoundError is raised on 404 response."""
        respx.patch(ASSET_URL).mock(return_value=Response(404, json={"detail": "Not found"}))

        with pytest.raises(NotFoundError):
            capture_client.update(TEST_NID, caption="test")


# ---------------------------------------------------------------------------
# get()
# ---------------------------------------------------------------------------


class TestGet:
    """Tests for get() request construction and response parsing."""

    @respx.mock
    def test_get_requests_correct_endpoint(self, capture_client):
        """Verify get() sends GET to the correct URL."""
        route = respx.get(ASSET_URL).mock(
            return_value=Response(200, json=MOCK_ASSET_RESPONSE)
        )

        capture_client.get(TEST_NID)

        assert route.called
        assert route.calls[0].request.method == "GET"

    @respx.mock
    def test_get_sends_authorization_header(self):
        """Verify Authorization header is set correctly."""
        route = respx.get(ASSET_URL).mock(
            return_value=Response(200, json=MOCK_ASSET_RESPONSE)
        )

        with Capture(token="get-token") as capture:
            capture.get(TEST_NID)

        request = route.calls[0].request
        assert request.headers["Authorization"] == "token get-token"

    @respx.mock
    def test_get_parses_asset_response(self, capture_client):
        """Verify get() correctly parses the API response."""
        respx.get(ASSET_URL).mock(return_value=Response(200, json=MOCK_ASSET_RESPONSE))

        asset = capture_client.get(TEST_NID)

        assert asset.nid == TEST_NID
        assert asset.filename == "test.png"
        assert asset.mime_type == "image/png"
        assert asset.caption == "Test caption"
        assert asset.headline == "Test headline"
        assert isinstance(asset, Asset)

    def test_get_raises_validation_error_for_empty_nid(self, capture_client):
        """Verify ValidationError is raised for empty NID."""
        with pytest.raises(ValidationError, match="nid is required"):
            capture_client.get("")

    @respx.mock
    def test_get_raises_not_found_error_on_404(self, capture_client):
        """Verify NotFoundError is raised on 404 response."""
        respx.get(ASSET_URL).mock(return_value=Response(404, json={"detail": "Not found"}))

        with pytest.raises(NotFoundError):
            capture_client.get(TEST_NID)

    @respx.mock
    def test_get_raises_authentication_error_on_401(self, capture_client):
        """Verify AuthenticationError is raised on 401 response."""
        respx.get(ASSET_URL).mock(return_value=Response(401, json={"detail": "Unauthorized"}))

        with pytest.raises(AuthenticationError):
            capture_client.get(TEST_NID)

    @respx.mock
    def test_get_uses_custom_base_url(self):
        """Verify get() uses custom base URL when configured."""
        custom_url = "https://custom.api.com/v1/assets/{}/".format(TEST_NID)
        route = respx.get(custom_url).mock(
            return_value=Response(200, json=MOCK_ASSET_RESPONSE)
        )

        with Capture(token="test-token", base_url="https://custom.api.com/v1") as capture:
            capture.get(TEST_NID)

        assert route.called


# ---------------------------------------------------------------------------
# get_history()
# ---------------------------------------------------------------------------


class TestGetHistory:
    """Tests for get_history() request construction and response parsing."""

    @respx.mock
    def test_get_history_includes_nid_in_query(self, capture_client):
        """Verify get_history() sends nid as query parameter."""
        route = respx.get(HISTORY_API_URL).mock(
            return_value=Response(200, json=MOCK_HISTORY_RESPONSE)
        )

        capture_client.get_history(TEST_NID)

        assert route.called
        request = route.calls[0].request
        assert TEST_NID in str(request.url)

    @respx.mock
    def test_get_history_includes_testnet_param_when_enabled(self):
        """Verify testnet=true is added when testnet mode is on."""
        route = respx.get(HISTORY_API_URL).mock(
            return_value=Response(200, json=MOCK_HISTORY_RESPONSE)
        )

        with Capture(token="test-token", testnet=True) as capture:
            capture.get_history(TEST_NID)

        request = route.calls[0].request
        assert "testnet=true" in str(request.url)

    @respx.mock
    def test_get_history_excludes_testnet_param_by_default(self, capture_client):
        """Verify testnet param is absent by default."""
        route = respx.get(HISTORY_API_URL).mock(
            return_value=Response(200, json=MOCK_HISTORY_RESPONSE)
        )

        capture_client.get_history(TEST_NID)

        request = route.calls[0].request
        assert "testnet" not in str(request.url)

    @respx.mock
    def test_get_history_sends_authorization_header(self):
        """Verify Authorization header is set correctly."""
        route = respx.get(HISTORY_API_URL).mock(
            return_value=Response(200, json=MOCK_HISTORY_RESPONSE)
        )

        with Capture(token="history-token") as capture:
            capture.get_history(TEST_NID)

        request = route.calls[0].request
        assert request.headers["Authorization"] == "token history-token"

    @respx.mock
    def test_get_history_parses_commits(self, capture_client):
        """Verify commits are correctly parsed from response."""
        respx.get(HISTORY_API_URL).mock(
            return_value=Response(200, json=MOCK_HISTORY_RESPONSE)
        )

        commits = capture_client.get_history(TEST_NID)

        assert len(commits) == 1
        commit = commits[0]
        assert isinstance(commit, Commit)
        assert commit.asset_tree_cid == "bafyreif123"
        assert commit.tx_hash == "0xabc123"
        assert commit.author == "0x1234"
        assert commit.committer == "0x1234"
        assert commit.timestamp == 1700000000
        assert commit.action == "create"

    @respx.mock
    def test_get_history_parses_multiple_commits(self, capture_client):
        """Verify multiple commits are all parsed."""
        multi_history = {
            "nid": TEST_NID,
            "commits": [
                {
                    "assetTreeCid": "bafyreif001",
                    "txHash": "0xhash001",
                    "author": "0xAuthor",
                    "committer": "0xAuthor",
                    "timestampCreated": 1700000000,
                    "action": "create",
                },
                {
                    "assetTreeCid": "bafyreif002",
                    "txHash": "0xhash002",
                    "author": "0xAuthor",
                    "committer": "0xEditor",
                    "timestampCreated": 1700001000,
                    "action": "update",
                },
            ],
        }
        respx.get(HISTORY_API_URL).mock(return_value=Response(200, json=multi_history))

        commits = capture_client.get_history(TEST_NID)

        assert len(commits) == 2
        assert commits[1].action == "update"

    def test_get_history_raises_validation_error_for_empty_nid(self, capture_client):
        """Verify ValidationError is raised for empty NID."""
        with pytest.raises(ValidationError, match="nid is required"):
            capture_client.get_history("")

    @respx.mock
    def test_get_history_raises_error_on_server_error(self, capture_client):
        """Verify NetworkError is raised on 500 response."""
        respx.get(HISTORY_API_URL).mock(return_value=Response(500))

        with pytest.raises(NetworkError):
            capture_client.get_history(TEST_NID)


# ---------------------------------------------------------------------------
# search_nft()
# ---------------------------------------------------------------------------


class TestSearchNft:
    """Tests for search_nft() request construction and response parsing."""

    MOCK_NFT_RESPONSE = {
        "records": [
            {
                "token_id": "42",
                "contract": "0xContract",
                "network": "ethereum",
                "owner": "0xOwner",
            }
        ],
        "order_id": "nft-order-123",
    }

    @respx.mock
    def test_search_nft_posts_to_nft_endpoint(self, capture_client):
        """Verify search_nft() POSTs to the NFT search endpoint."""
        route = respx.post(NFT_SEARCH_API_URL).mock(
            return_value=Response(200, json=self.MOCK_NFT_RESPONSE)
        )

        capture_client.search_nft(TEST_NID)

        assert route.called
        assert route.calls[0].request.method == "POST"

    @respx.mock
    def test_search_nft_sends_nid_in_json_body(self, capture_client):
        """Verify NID is sent in JSON body."""
        route = respx.post(NFT_SEARCH_API_URL).mock(
            return_value=Response(200, json=self.MOCK_NFT_RESPONSE)
        )

        capture_client.search_nft(TEST_NID)

        import json
        request = route.calls[0].request
        body = json.loads(request.content)
        assert body["nid"] == TEST_NID

    @respx.mock
    def test_search_nft_sends_authorization_header(self):
        """Verify Authorization header is set correctly."""
        route = respx.post(NFT_SEARCH_API_URL).mock(
            return_value=Response(200, json=self.MOCK_NFT_RESPONSE)
        )

        with Capture(token="nft-token") as capture:
            capture.search_nft(TEST_NID)

        request = route.calls[0].request
        assert request.headers["Authorization"] == "token nft-token"

    @respx.mock
    def test_search_nft_sends_content_type_json(self, capture_client):
        """Verify Content-Type: application/json header is sent."""
        route = respx.post(NFT_SEARCH_API_URL).mock(
            return_value=Response(200, json=self.MOCK_NFT_RESPONSE)
        )

        capture_client.search_nft(TEST_NID)

        request = route.calls[0].request
        assert "application/json" in request.headers.get("content-type", "")

    @respx.mock
    def test_search_nft_parses_nft_records(self, capture_client):
        """Verify NFT records are correctly parsed from response."""
        respx.post(NFT_SEARCH_API_URL).mock(
            return_value=Response(200, json=self.MOCK_NFT_RESPONSE)
        )

        result = capture_client.search_nft(TEST_NID)

        assert len(result.records) == 1
        record = result.records[0]
        assert isinstance(record, NftRecord)
        assert record.token_id == "42"
        assert record.contract == "0xContract"
        assert record.network == "ethereum"
        assert record.owner == "0xOwner"
        assert result.order_id == "nft-order-123"

    @respx.mock
    def test_search_nft_handles_empty_records(self, capture_client):
        """Verify empty records list is handled correctly."""
        respx.post(NFT_SEARCH_API_URL).mock(
            return_value=Response(200, json={"records": [], "order_id": "empty-order"})
        )

        result = capture_client.search_nft(TEST_NID)

        assert len(result.records) == 0
        assert result.order_id == "empty-order"

    def test_search_nft_raises_validation_error_for_empty_nid(self, capture_client):
        """Verify ValidationError is raised for empty NID."""
        with pytest.raises(ValidationError, match="nid is required for NFT search"):
            capture_client.search_nft("")

    @respx.mock
    def test_search_nft_raises_authentication_error_on_401(self, capture_client):
        """Verify AuthenticationError is raised on 401 response."""
        respx.post(NFT_SEARCH_API_URL).mock(
            return_value=Response(401, json={"message": "Unauthorized"})
        )

        with pytest.raises(AuthenticationError):
            capture_client.search_nft(TEST_NID)

    @respx.mock
    def test_search_nft_raises_network_error_on_500(self, capture_client):
        """Verify NetworkError is raised on 500 response."""
        respx.post(NFT_SEARCH_API_URL).mock(
            return_value=Response(500, json={"message": "Server error"})
        )

        with pytest.raises(NetworkError):
            capture_client.search_nft(TEST_NID)


# ---------------------------------------------------------------------------
# _normalize_file()
# ---------------------------------------------------------------------------


class TestNormalizeFile:
    """Tests for _normalize_file() function with various input types."""

    def test_normalize_str_path(self, tmp_path):
        """Verify string path input is normalized correctly."""
        test_file = tmp_path / "photo.jpg"
        test_file.write_bytes(b"jpeg data")

        data, filename, mime_type = _normalize_file(str(test_file))

        assert data == b"jpeg data"
        assert filename == "photo.jpg"
        assert mime_type == "image/jpeg"

    def test_normalize_path_object(self, tmp_path):
        """Verify Path object input is normalized correctly."""
        test_file = tmp_path / "image.png"
        test_file.write_bytes(b"png data")

        data, filename, mime_type = _normalize_file(test_file)

        assert data == b"png data"
        assert filename == "image.png"
        assert mime_type == "image/png"

    def test_normalize_bytes_with_filename(self):
        """Verify bytes input with filename option is normalized correctly."""
        from numbersprotocol_capture.types import RegisterOptions

        options = RegisterOptions(filename="video.mp4")
        data, filename, mime_type = _normalize_file(b"video data", options)

        assert data == b"video data"
        assert filename == "video.mp4"
        assert mime_type == "video/mp4"

    def test_normalize_bytearray_with_filename(self):
        """Verify bytearray input is treated the same as bytes."""
        from numbersprotocol_capture.types import RegisterOptions

        options = RegisterOptions(filename="audio.mp3")
        data, filename, mime_type = _normalize_file(bytearray(b"audio data"), options)

        assert data == b"audio data"
        assert filename == "audio.mp3"
        assert mime_type == "audio/mpeg"

    def test_normalize_raises_for_nonexistent_str_path(self):
        """Verify ValidationError is raised for a string path that doesn't exist."""
        with pytest.raises(ValidationError, match="File not found"):
            _normalize_file("/nonexistent/path/image.png")

    def test_normalize_raises_for_nonexistent_path_object(self):
        """Verify ValidationError is raised for a Path that doesn't exist."""
        with pytest.raises(ValidationError, match="File not found"):
            _normalize_file(Path("/nonexistent/path/image.png"))

    def test_normalize_raises_for_bytes_without_filename(self):
        """Verify ValidationError is raised for bytes input without filename."""
        with pytest.raises(ValidationError, match="filename is required"):
            _normalize_file(b"data")

    def test_normalize_infers_mime_type_from_extension(self, tmp_path):
        """Verify MIME type is correctly inferred from the file extension."""
        for ext, expected_mime in [
            ("jpg", "image/jpeg"),
            ("png", "image/png"),
            ("mp4", "video/mp4"),
            ("pdf", "application/pdf"),
            ("txt", "text/plain"),
        ]:
            test_file = tmp_path / f"file.{ext}"
            test_file.write_bytes(b"data")
            _, _, mime_type = _normalize_file(test_file)
            assert mime_type == expected_mime, f"Expected {expected_mime} for .{ext}"

    def test_normalize_uses_octet_stream_for_unknown_extension(self, tmp_path):
        """Verify application/octet-stream is used for unknown file extensions."""
        test_file = tmp_path / "file.xyz_unknown"
        test_file.write_bytes(b"data")

        _, _, mime_type = _normalize_file(test_file)

        assert mime_type == "application/octet-stream"
