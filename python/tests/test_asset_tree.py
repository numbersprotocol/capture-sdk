"""
Unit tests for asset tree parsing following the AssetTree specification.

These tests verify that the SDK correctly parses asset tree responses
including all fields from the Numbers Protocol AssetTree spec.

See: https://docs.numbersprotocol.io/introduction/numbers-protocol/defining-web3-assets/assettree
"""

import pytest
import respx
from httpx import Response

from capture_sdk import Capture, License
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
    """Mock response for merged asset tree API with all spec fields."""
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
            "license": {
                "name": "CC BY 4.0",
                "document": "https://creativecommons.org/licenses/by/4.0/",
            },
            "mimeType": "image/png",
            "nftRecord": EXPECTED_NFT_RECORD,
            "usedBy": "https://example.com",
            "integrityCid": "bafybeiintegrity123",
            "digitalSourceType": "digitalCapture",
            "miningPreference": "opt-in",
            "generatedBy": "human",
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
        respx.get(HISTORY_API_URL).mock(
            return_value=Response(200, json=mock_history_response)
        )
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
        respx.get(HISTORY_API_URL).mock(
            return_value=Response(200, json=mock_history_response)
        )
        respx.post(MERGE_TREE_API_URL).mock(
            return_value=Response(200, json=mock_merged_tree_response)
        )

        tree = capture_client.get_asset_tree(TEST_NID)

        assert tree.nft_record == EXPECTED_NFT_RECORD

    @respx.mock
    def test_get_asset_tree_parses_license_object(
        self,
        capture_client,
        mock_history_response,
        mock_merged_tree_response,
    ):
        """Verify license is correctly parsed as an object with name and document."""
        respx.get(HISTORY_API_URL).mock(
            return_value=Response(200, json=mock_history_response)
        )
        respx.post(MERGE_TREE_API_URL).mock(
            return_value=Response(200, json=mock_merged_tree_response)
        )

        tree = capture_client.get_asset_tree(TEST_NID)

        assert tree.license is not None
        assert tree.license.name == "CC BY 4.0"
        assert tree.license.document == "https://creativecommons.org/licenses/by/4.0/"

    @respx.mock
    def test_get_asset_tree_parses_license_string_backwards_compat(
        self,
        capture_client,
        mock_history_response,
    ):
        """Verify license string is converted to License object for backwards compatibility."""
        response_with_string_license = {
            "mergedAssetTree": {
                "assetCid": "bafybei123",
                "creatorWallet": EXPECTED_CREATOR_WALLET,
                "license": "MIT License",
            },
            "assetTrees": [],
        }

        respx.get(HISTORY_API_URL).mock(
            return_value=Response(200, json=mock_history_response)
        )
        respx.post(MERGE_TREE_API_URL).mock(
            return_value=Response(200, json=response_with_string_license)
        )

        tree = capture_client.get_asset_tree(TEST_NID)

        assert tree.license is not None
        assert tree.license.name == "MIT License"
        assert tree.license.document is None

    @respx.mock
    def test_get_asset_tree_parses_new_spec_fields(
        self,
        capture_client,
        mock_history_response,
        mock_merged_tree_response,
    ):
        """Verify new AssetTree spec fields are correctly parsed."""
        respx.get(HISTORY_API_URL).mock(
            return_value=Response(200, json=mock_history_response)
        )
        respx.post(MERGE_TREE_API_URL).mock(
            return_value=Response(200, json=mock_merged_tree_response)
        )

        tree = capture_client.get_asset_tree(TEST_NID)

        # Verify new fields from spec
        assert tree.used_by == "https://example.com"
        assert tree.integrity_cid == "bafybeiintegrity123"
        assert tree.digital_source_type == "digitalCapture"
        assert tree.mining_preference == "opt-in"
        assert tree.generated_by == "human"

    @respx.mock
    def test_get_asset_tree_parses_all_known_fields(
        self,
        capture_client,
        mock_history_response,
        mock_merged_tree_response,
    ):
        """Verify all known fields are correctly parsed."""
        respx.get(HISTORY_API_URL).mock(
            return_value=Response(200, json=mock_history_response)
        )
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
        assert tree.license is not None
        assert tree.license.name == "CC BY 4.0"
        assert tree.mime_type == "image/png"
        assert tree.nft_record == EXPECTED_NFT_RECORD
        assert tree.used_by == "https://example.com"
        assert tree.integrity_cid == "bafybeiintegrity123"
        assert tree.digital_source_type == "digitalCapture"
        assert tree.mining_preference == "opt-in"
        assert tree.generated_by == "human"

    @respx.mock
    def test_get_asset_tree_stores_unknown_fields_in_extra(
        self,
        capture_client,
        mock_history_response,
        mock_merged_tree_response,
    ):
        """Verify unknown fields are stored in the extra dict."""
        respx.get(HISTORY_API_URL).mock(
            return_value=Response(200, json=mock_history_response)
        )
        respx.post(MERGE_TREE_API_URL).mock(
            return_value=Response(200, json=mock_merged_tree_response)
        )

        tree = capture_client.get_asset_tree(TEST_NID)

        # Verify extra field is in the extra dict
        assert "extraField" in tree.extra
        assert tree.extra["extraField"] == "extra value"

    @respx.mock
    def test_get_asset_tree_handles_missing_optional_fields(
        self,
        capture_client,
        mock_history_response,
    ):
        """Verify SDK handles missing optional fields gracefully."""
        minimal_response = {
            "mergedAssetTree": {
                "assetCid": "bafybei123",
                "creatorWallet": EXPECTED_CREATOR_WALLET,
            },
            "assetTrees": [],
        }

        respx.get(HISTORY_API_URL).mock(
            return_value=Response(200, json=mock_history_response)
        )
        respx.post(MERGE_TREE_API_URL).mock(
            return_value=Response(200, json=minimal_response)
        )

        tree = capture_client.get_asset_tree(TEST_NID)

        assert tree.asset_cid == "bafybei123"
        assert tree.creator_wallet == EXPECTED_CREATOR_WALLET
        assert tree.nft_record is None
        assert tree.license is None
        assert tree.used_by is None
        assert tree.integrity_cid is None
        assert tree.digital_source_type is None
        assert tree.mining_preference is None
        assert tree.generated_by is None


class TestAssetTreeType:
    """Tests for AssetTree dataclass."""

    def test_asset_tree_has_all_spec_fields(self):
        """Verify AssetTree has all fields from the spec."""
        tree = AssetTree(
            asset_cid="bafybei123",
            asset_sha256="abc123",
            creator_name="Test Creator",
            creator_wallet=EXPECTED_CREATOR_WALLET,
            created_at=1700000000,
            location_created="Taiwan",
            caption="Test caption",
            headline="Test headline",
            license=License(name="CC BY 4.0", document="https://example.com"),
            mime_type="image/png",
            nft_record=EXPECTED_NFT_RECORD,
            used_by="https://example.com",
            integrity_cid="bafybeiintegrity123",
            digital_source_type="digitalCapture",
            mining_preference="opt-in",
            generated_by="human",
        )

        assert tree.asset_cid == "bafybei123"
        assert tree.nft_record == EXPECTED_NFT_RECORD
        assert tree.license.name == "CC BY 4.0"
        assert tree.used_by == "https://example.com"
        assert tree.digital_source_type == "digitalCapture"

    def test_asset_tree_fields_default_to_none(self):
        """Verify all optional fields default to None."""
        tree = AssetTree()

        assert tree.asset_cid is None
        assert tree.nft_record is None
        assert tree.license is None
        assert tree.used_by is None
        assert tree.integrity_cid is None
        assert tree.digital_source_type is None
        assert tree.mining_preference is None
        assert tree.generated_by is None


class TestLicenseType:
    """Tests for License dataclass."""

    def test_license_has_name_and_document(self):
        """Verify License has name and document fields."""
        license_info = License(
            name="CC BY 4.0",
            document="https://creativecommons.org/licenses/by/4.0/",
        )

        assert license_info.name == "CC BY 4.0"
        assert license_info.document == "https://creativecommons.org/licenses/by/4.0/"

    def test_license_fields_default_to_none(self):
        """Verify License fields default to None."""
        license_info = License()

        assert license_info.name is None
        assert license_info.document is None

    def test_license_with_name_only(self):
        """Verify License can be created with name only."""
        license_info = License(name="MIT")

        assert license_info.name == "MIT"
        assert license_info.document is None
