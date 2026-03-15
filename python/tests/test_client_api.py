"""
Tests for Capture client API methods: get, update, get_history, search_nft,
URL overrides, and context manager.
"""

import pytest
import respx
from httpx import Response

from numbersprotocol_capture import Capture, ValidationError
from numbersprotocol_capture.client import (
    DEFAULT_BASE_URL,
    HISTORY_API_URL,
    NFT_SEARCH_API_URL,
)
from numbersprotocol_capture.types import CaptureOptions

TEST_NID = "bafybeif3mhxhkhfwuszl2lybtai3hz3q6naqpfisd4q55mcc7opkmiv5ei"

MOCK_ASSET_RESPONSE = {
    "id": TEST_NID,
    "asset_file_name": "photo.jpg",
    "asset_file_mime_type": "image/jpeg",
    "caption": "My photo",
    "headline": "Demo",
}

MOCK_HISTORY_RESPONSE = {
    "nid": TEST_NID,
    "commits": [
        {
            "assetTreeCid": "bafy_tree_cid",
            "txHash": "0xabc",
            "author": "0xauthor",
            "committer": "0xcommitter",
            "timestampCreated": 1700000000,
            "action": "initial-commit",
        }
    ],
}


class TestGetAsset:
    """Tests for the get() method."""

    @respx.mock
    def test_get_returns_asset(self) -> None:
        respx.get(f"{DEFAULT_BASE_URL}/assets/{TEST_NID}/").mock(
            return_value=Response(200, json=MOCK_ASSET_RESPONSE)
        )

        with Capture(token="test-token") as capture:
            asset = capture.get(TEST_NID)

        assert asset.nid == TEST_NID
        assert asset.filename == "photo.jpg"
        assert asset.mime_type == "image/jpeg"
        assert asset.caption == "My photo"
        assert asset.headline == "Demo"

    def test_get_empty_nid_raises(self) -> None:
        with Capture(token="test-token") as capture:
            with pytest.raises(ValidationError, match="nid is required"):
                capture.get("")

    @respx.mock
    def test_get_not_found_raises(self) -> None:
        from numbersprotocol_capture import NotFoundError

        respx.get(f"{DEFAULT_BASE_URL}/assets/{TEST_NID}/").mock(
            return_value=Response(404, json={"detail": "Not found"})
        )

        with Capture(token="test-token") as capture:
            with pytest.raises(NotFoundError):
                capture.get(TEST_NID)

    @respx.mock
    def test_get_sends_auth_header(self) -> None:
        route = respx.get(f"{DEFAULT_BASE_URL}/assets/{TEST_NID}/").mock(
            return_value=Response(200, json=MOCK_ASSET_RESPONSE)
        )

        with Capture(token="secret-token") as capture:
            capture.get(TEST_NID)

        request = route.calls.last.request
        assert request.headers["authorization"] == "token secret-token"


class TestUpdateAsset:
    """Tests for the update() method."""

    @respx.mock
    def test_update_returns_asset(self) -> None:
        updated = {**MOCK_ASSET_RESPONSE, "caption": "Updated caption"}
        respx.patch(f"{DEFAULT_BASE_URL}/assets/{TEST_NID}/").mock(
            return_value=Response(200, json=updated)
        )

        with Capture(token="test-token") as capture:
            asset = capture.update(TEST_NID, caption="Updated caption")

        assert asset.nid == TEST_NID
        assert asset.caption == "Updated caption"

    def test_update_empty_nid_raises(self) -> None:
        with Capture(token="test-token") as capture:
            with pytest.raises(ValidationError, match="nid is required"):
                capture.update("", caption="test")

    def test_update_long_headline_raises(self) -> None:
        with Capture(token="test-token") as capture:
            with pytest.raises(ValidationError, match="headline must be 25 characters or less"):
                capture.update(TEST_NID, headline="a" * 26)

    @respx.mock
    def test_update_with_custom_metadata(self) -> None:
        respx.patch(f"{DEFAULT_BASE_URL}/assets/{TEST_NID}/").mock(
            return_value=Response(200, json=MOCK_ASSET_RESPONSE)
        )

        with Capture(token="test-token") as capture:
            asset = capture.update(
                TEST_NID,
                caption="test",
                custom_metadata={"key": "value"},
            )

        assert asset.nid == TEST_NID


class TestGetHistory:
    """Tests for the get_history() method."""

    @respx.mock
    def test_get_history_returns_commits(self) -> None:
        respx.get(HISTORY_API_URL).mock(
            return_value=Response(200, json=MOCK_HISTORY_RESPONSE)
        )

        with Capture(token="test-token") as capture:
            commits = capture.get_history(TEST_NID)

        assert len(commits) == 1
        commit = commits[0]
        assert commit.asset_tree_cid == "bafy_tree_cid"
        assert commit.tx_hash == "0xabc"
        assert commit.author == "0xauthor"
        assert commit.committer == "0xcommitter"
        assert commit.timestamp == 1700000000
        assert commit.action == "initial-commit"

    def test_get_history_empty_nid_raises(self) -> None:
        with Capture(token="test-token") as capture:
            with pytest.raises(ValidationError, match="nid is required"):
                capture.get_history("")

    @respx.mock
    def test_get_history_with_testnet(self) -> None:
        route = respx.get(HISTORY_API_URL).mock(
            return_value=Response(200, json=MOCK_HISTORY_RESPONSE)
        )

        with Capture(token="test-token", testnet=True) as capture:
            capture.get_history(TEST_NID)

        request_url = str(route.calls.last.request.url)
        assert "testnet=true" in request_url


class TestSearchNft:
    """Tests for the search_nft() method."""

    @respx.mock
    def test_search_nft_returns_records(self) -> None:
        respx.post(NFT_SEARCH_API_URL).mock(
            return_value=Response(
                200,
                json={
                    "records": [
                        {
                            "token_id": "42",
                            "contract": "0xcontract",
                            "network": "polygon",
                            "owner": "0xowner",
                        }
                    ],
                    "order_id": "nft_order_1",
                },
            )
        )

        with Capture(token="test-token") as capture:
            result = capture.search_nft(TEST_NID)

        assert len(result.records) == 1
        assert result.records[0].token_id == "42"
        assert result.records[0].contract == "0xcontract"
        assert result.records[0].network == "polygon"
        assert result.records[0].owner == "0xowner"
        assert result.order_id == "nft_order_1"

    def test_search_nft_empty_nid_raises(self) -> None:
        with Capture(token="test-token") as capture:
            with pytest.raises(ValidationError, match="nid is required for NFT search"):
                capture.search_nft("")

    @respx.mock
    def test_search_nft_empty_records(self) -> None:
        respx.post(NFT_SEARCH_API_URL).mock(
            return_value=Response(200, json={"records": [], "order_id": "o1"})
        )

        with Capture(token="test-token") as capture:
            result = capture.search_nft(TEST_NID)

        assert result.records == []


class TestRegisterAsset:
    """Tests for the register() method."""

    @respx.mock
    def test_register_with_bytes(self) -> None:
        respx.post(f"{DEFAULT_BASE_URL}/assets/").mock(
            return_value=Response(200, json=MOCK_ASSET_RESPONSE)
        )

        with Capture(token="test-token") as capture:
            asset = capture.register(b"test content", filename="test.txt")

        assert asset.nid == TEST_NID

    @respx.mock
    def test_register_with_file_path(self, tmp_path) -> None:
        test_file = tmp_path / "test.txt"
        test_file.write_bytes(b"test content")

        respx.post(f"{DEFAULT_BASE_URL}/assets/").mock(
            return_value=Response(200, json=MOCK_ASSET_RESPONSE)
        )

        with Capture(token="test-token") as capture:
            asset = capture.register(str(test_file))

        assert asset.nid == TEST_NID

    @respx.mock
    def test_register_sends_auth_header(self) -> None:
        route = respx.post(f"{DEFAULT_BASE_URL}/assets/").mock(
            return_value=Response(200, json=MOCK_ASSET_RESPONSE)
        )

        with Capture(token="my-token") as capture:
            capture.register(b"data", filename="f.bin")

        request = route.calls.last.request
        assert request.headers["authorization"] == "token my-token"

    @respx.mock
    def test_register_with_caption_and_headline(self, tmp_path) -> None:
        test_file = tmp_path / "test.jpg"
        test_file.write_bytes(b"jpeg data")

        respx.post(f"{DEFAULT_BASE_URL}/assets/").mock(
            return_value=Response(200, json=MOCK_ASSET_RESPONSE)
        )

        with Capture(token="test-token") as capture:
            asset = capture.register(
                str(test_file), caption="My caption", headline="Short title"
            )

        assert asset.nid == TEST_NID


class TestUrlOverrides:
    """Tests for URL override support in CaptureOptions."""

    def test_custom_history_api_url(self) -> None:
        custom_url = "https://custom-history.example.com"
        capture = Capture(token="test-token", history_api_url=custom_url)
        assert capture._history_api_url == custom_url
        capture.close()

    def test_custom_merge_tree_api_url(self) -> None:
        custom_url = "https://custom-merge.example.com"
        capture = Capture(token="test-token", merge_tree_api_url=custom_url)
        assert capture._merge_tree_api_url == custom_url
        capture.close()

    def test_custom_asset_search_api_url(self) -> None:
        custom_url = "https://custom-search.example.com"
        capture = Capture(token="test-token", asset_search_api_url=custom_url)
        assert capture._asset_search_api_url == custom_url
        capture.close()

    def test_custom_nft_search_api_url(self) -> None:
        custom_url = "https://custom-nft.example.com"
        capture = Capture(token="test-token", nft_search_api_url=custom_url)
        assert capture._nft_search_api_url == custom_url
        capture.close()

    def test_url_overrides_via_capture_options(self) -> None:
        opts = CaptureOptions(
            token="test-token",
            history_api_url="https://custom-history.example.com",
            asset_search_api_url="https://custom-search.example.com",
        )
        capture = Capture(options=opts)
        assert capture._history_api_url == "https://custom-history.example.com"
        assert capture._asset_search_api_url == "https://custom-search.example.com"
        capture.close()

    @respx.mock
    def test_custom_asset_search_url_is_used(self) -> None:
        custom_url = "https://custom-search.example.com/search"
        respx.post(custom_url).mock(
            return_value=Response(
                200,
                json={
                    "precise_match": "",
                    "input_file_mime_type": "",
                    "similar_matches": [],
                    "order_id": "o1",
                },
            )
        )

        with Capture(token="test-token", asset_search_api_url=custom_url) as capture:
            result = capture.search_asset(nid=TEST_NID)

        assert result.order_id == "o1"

    @respx.mock
    def test_custom_nft_search_url_is_used(self) -> None:
        custom_url = "https://custom-nft.example.com/nft"
        respx.post(custom_url).mock(
            return_value=Response(
                200,
                json={"records": [], "order_id": "nft_o1"},
            )
        )

        with Capture(token="test-token", nft_search_api_url=custom_url) as capture:
            result = capture.search_nft(TEST_NID)

        assert result.order_id == "nft_o1"
