"""
Unit tests for asset tree parsing with nftRecord field.

These tests verify that the SDK correctly parses asset tree responses
including the nftRecord field.
"""

import pytest
import respx
from httpx import Response

from capture_sdk import Capture
from capture_sdk.types import AssetTree

# Test asset NID
TEST_NID = "bafybeif3mhxhkhfwuszl2lybtai3hz3q6naqpfisd4q55mcc7opkmiv5ei"

# Expected values
EXPECTED_CREATOR_WALLET = "0x019F590C900c78060da8597186d065ee514931BB"
EXPECTED_NFT_RECORD = "bafkreibjj4sgpeirznei5or3lncndzije6nw4qsksoomsbu23ivp7bdwei"

# Mock API URLs
HISTORY_API_URL = "https://e23hi68y55.execute-api.us-east-1.amazonaws.com/default/get-commits-storage-backend-jade-near"
MERGE_TREE_API_URL = "https://us-central1-numbers-protocol-api.cloudfunctions.net/get-full-asset-tree"


@pytest.fixture
def capture_client():
    """Create a Capture client with test token."""
    return Capture(token="test-token")


@pytest.fixture
def mock_history_response():
    """Mock response for get_history API."""
    return {
        "nid": TEST_NID,
        "commits": [
            {
                "assetTreeCid": "bafyreif123",
                "txHash": "0xabc123",
                "author": EXPECTED_CREATOR_WALLET,
                "committer": EXPECTED_CREATOR_WALLET,
                "timestampCreated": 1700000000,
                "action": "create",
            }
        ],
    }


@pytest.fixture
def mock_merged_tree_response():
    """Mock response for merged asset tree API."""
    return {
        "mergedAssetTree": {
            "assetCid": "bafybei123",
            "assetSha256": "abc123def456",
            "creatorName": "Test Creator",
            "creatorWallet": EXPECTED_CREATOR_WALLET,
            "createdAt": 1700000000,
            "locationCreated": "Taiwan",
            "caption": "Test caption",
            "headline": "Test headline",
            "license": "CC BY 4.0",
            "mimeType": "image/png",
            "nftRecord": EXPECTED_NFT_RECORD,
            "extraField": "extra value",
        },
        "assetTrees": [],
    }


class TestAssetTreeParsing:
    """Tests for asset tree parsing."""

    @respx.mock
    def test_get_asset_tree_parses_creator_wallet(
        self,
        capture_client,
        mock_history_response,
        mock_merged_tree_response,
    ):
        """Verify creator_wallet is correctly parsed from API response."""
        # Mock the history API
        respx.get(HISTORY_API_URL).mock(
            return_value=Response(200, json=mock_history_response)
        )
        # Mock the merge tree API
        respx.post(MERGE_TREE_API_URL).mock(
            return_value=Response(200, json=mock_merged_tree_response)
        )

        tree = capture_client.get_asset_tree(TEST_NID)

        assert tree.creator_wallet == EXPECTED_CREATOR_WALLET

    @respx.mock
    def test_get_asset_tree_parses_nft_record(
        self,
        capture_client,
        mock_history_response,
        mock_merged_tree_response,
    ):
        """Verify nft_record is correctly parsed from API response."""
        # Mock the history API
        respx.get(HISTORY_API_URL).mock(
            return_value=Response(200, json=mock_history_response)
        )
        # Mock the merge tree API
        respx.post(MERGE_TREE_API_URL).mock(
            return_value=Response(200, json=mock_merged_tree_response)
        )

        tree = capture_client.get_asset_tree(TEST_NID)

        assert tree.nft_record == EXPECTED_NFT_RECORD

    @respx.mock
    def test_get_asset_tree_parses_all_known_fields(
        self,
        capture_client,
        mock_history_response,
        mock_merged_tree_response,
    ):
        """Verify all known fields are correctly parsed."""
        # Mock the history API
        respx.get(HISTORY_API_URL).mock(
            return_value=Response(200, json=mock_history_response)
        )
        # Mock the merge tree API
        respx.post(MERGE_TREE_API_URL).mock(
            return_value=Response(200, json=mock_merged_tree_response)
        )

        tree = capture_client.get_asset_tree(TEST_NID)

        # Verify all known fields
        assert tree.asset_cid == "bafybei123"
        assert tree.asset_sha256 == "abc123def456"
        assert tree.creator_name == "Test Creator"
        assert tree.creator_wallet == EXPECTED_CREATOR_WALLET
        assert tree.created_at == 1700000000
        assert tree.location_created == "Taiwan"
        assert tree.caption == "Test caption"
        assert tree.headline == "Test headline"
        assert tree.license == "CC BY 4.0"
        assert tree.mime_type == "image/png"
        assert tree.nft_record == EXPECTED_NFT_RECORD

    @respx.mock
    def test_get_asset_tree_stores_unknown_fields_in_extra(
        self,
        capture_client,
        mock_history_response,
        mock_merged_tree_response,
    ):
        """Verify unknown fields are stored in the extra dict."""
        # Mock the history API
        respx.get(HISTORY_API_URL).mock(
            return_value=Response(200, json=mock_history_response)
        )
        # Mock the merge tree API
        respx.post(MERGE_TREE_API_URL).mock(
            return_value=Response(200, json=mock_merged_tree_response)
        )

        tree = capture_client.get_asset_tree(TEST_NID)

        # Verify extra field is in the extra dict
        assert "extraField" in tree.extra
        assert tree.extra["extraField"] == "extra value"

    @respx.mock
    def test_get_asset_tree_handles_missing_nft_record(
        self,
        capture_client,
        mock_history_response,
    ):
        """Verify SDK handles missing nftRecord gracefully."""
        # Response without nftRecord
        response_without_nft = {
            "mergedAssetTree": {
                "assetCid": "bafybei123",
                "creatorWallet": EXPECTED_CREATOR_WALLET,
            },
            "assetTrees": [],
        }

        # Mock the history API
        respx.get(HISTORY_API_URL).mock(
            return_value=Response(200, json=mock_history_response)
        )
        # Mock the merge tree API
        respx.post(MERGE_TREE_API_URL).mock(
            return_value=Response(200, json=response_without_nft)
        )

        tree = capture_client.get_asset_tree(TEST_NID)

        assert tree.nft_record is None
        assert tree.creator_wallet == EXPECTED_CREATOR_WALLET


class TestAssetTreeType:
    """Tests for AssetTree dataclass."""

    def test_asset_tree_has_nft_record_field(self):
        """Verify AssetTree has nft_record field."""
        tree = AssetTree(
            creator_wallet=EXPECTED_CREATOR_WALLET,
            nft_record=EXPECTED_NFT_RECORD,
        )

        assert tree.nft_record == EXPECTED_NFT_RECORD

    def test_asset_tree_nft_record_defaults_to_none(self):
        """Verify nft_record defaults to None."""
        tree = AssetTree()

        assert tree.nft_record is None

    def test_asset_tree_extra_does_not_contain_nft_record(self):
        """Verify nftRecord is not stored in extra when set as nft_record."""
        tree = AssetTree(
            creator_wallet=EXPECTED_CREATOR_WALLET,
            nft_record=EXPECTED_NFT_RECORD,
            extra={"otherField": "value"},
        )

        assert "nftRecord" not in tree.extra
        assert tree.nft_record == EXPECTED_NFT_RECORD
