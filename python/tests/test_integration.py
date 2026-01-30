"""
Integration tests for Capture SDK.

These tests verify that the SDK correctly retrieves and parses
data from the Numbers Protocol API.

Run with: pytest tests/test_integration.py -v
Set CAPTURE_TOKEN environment variable for live API tests.
"""

import os

import pytest

from capture_sdk import Capture

# Test asset NID
TEST_NID = "bafybeif3mhxhkhfwuszl2lybtai3hz3q6naqpfisd4q55mcc7opkmiv5ei"

# Expected values for Test 1
EXPECTED_CREATOR_WALLET = "0x019F590C900c78060da8597186d065ee514931BB"
EXPECTED_NFT_RECORD = "bafkreibjj4sgpeirznei5or3lncndzije6nw4qsksoomsbu23ivp7bdwei"


@pytest.fixture
def capture_client():
    """Create a Capture client using CAPTURE_TOKEN from environment."""
    token = os.environ.get("CAPTURE_TOKEN")
    if not token:
        pytest.skip("CAPTURE_TOKEN environment variable is required")
    return Capture(token=token)


class TestAssetTree:
    """Test 1: Verify asset tree contains correct creatorWallet and nftRecord."""

    def test_get_asset_tree_returns_creator_wallet(self, capture_client):
        """Verify asset tree contains correct creatorWallet."""
        tree = capture_client.get_asset_tree(TEST_NID)

        assert tree.creator_wallet is not None, "creatorWallet should not be None"
        assert tree.creator_wallet == EXPECTED_CREATOR_WALLET, (
            f"creatorWallet mismatch: expected {EXPECTED_CREATOR_WALLET}, "
            f"got {tree.creator_wallet}"
        )

    def test_get_asset_tree_returns_nft_record(self, capture_client):
        """Verify asset tree contains correct nftRecord."""
        tree = capture_client.get_asset_tree(TEST_NID)

        assert tree.nft_record is not None, "nftRecord should not be None"
        assert tree.nft_record == EXPECTED_NFT_RECORD, (
            f"nftRecord mismatch: expected {EXPECTED_NFT_RECORD}, "
            f"got {tree.nft_record}"
        )

    def test_get_asset_tree_returns_all_fields(self, capture_client):
        """Verify asset tree contains all expected fields."""
        tree = capture_client.get_asset_tree(TEST_NID)

        # Print asset tree for debugging
        print(f"\nAsset Tree for {TEST_NID}:")
        print(f"  asset_cid: {tree.asset_cid}")
        print(f"  creator_name: {tree.creator_name}")
        print(f"  creator_wallet: {tree.creator_wallet}")
        print(f"  nft_record: {tree.nft_record}")
        print(f"  mime_type: {tree.mime_type}")
        print(f"  extra keys: {list(tree.extra.keys())}")

        # Verify key fields exist
        assert tree.creator_wallet == EXPECTED_CREATOR_WALLET
        assert tree.nft_record == EXPECTED_NFT_RECORD


class TestAssetSearch:
    """Test 2: Verify asset search returns correct results."""

    def test_search_asset_by_nid(self, capture_client):
        """Search for asset by NID and verify results."""
        result = capture_client.search_asset(nid=TEST_NID)

        print(f"\nSearch Results for {TEST_NID}:")
        print(f"  precise_match: {result.precise_match}")
        print(f"  input_file_mime_type: {result.input_file_mime_type}")
        print(f"  similar_matches count: {len(result.similar_matches)}")

        if result.similar_matches:
            print("\n  Similar matches (top 5):")
            for i, match in enumerate(result.similar_matches[:5]):
                print(f"    {i + 1}. {match.nid} (distance: {match.distance})")

        # The search should return results
        assert result.order_id, "order_id should not be empty"

    def test_search_asset_by_file(self, capture_client, tmp_path):
        """Search for asset using a file and verify results contain the expected NID."""
        # Skip if no test image is provided via environment
        test_image_path = os.environ.get("TEST_IMAGE_PATH")
        if not test_image_path:
            pytest.skip("TEST_IMAGE_PATH environment variable not set")

        result = capture_client.search_asset(file=test_image_path)

        print(f"\nSearch Results for image {test_image_path}:")
        print(f"  precise_match: {result.precise_match}")
        print(f"  input_file_mime_type: {result.input_file_mime_type}")
        print(f"  similar_matches count: {len(result.similar_matches)}")

        # Check if expected NID is in results
        found_exact = result.precise_match == TEST_NID
        found_similar = any(m.nid == TEST_NID for m in result.similar_matches)

        assert found_exact or found_similar, (
            f"Expected NID {TEST_NID} not found in results"
        )

        if found_exact:
            print(f"\n  Found exact match: {TEST_NID}")
        else:
            print(f"\n  Found in similar matches: {TEST_NID}")

        # Verify there are other similar assets
        other_matches = [m for m in result.similar_matches if m.nid != TEST_NID]
        if other_matches:
            print(f"  Found {len(other_matches)} other similar assets")

    def test_search_asset_returns_similar_matches(self, capture_client):
        """Verify search returns similar matches."""
        result = capture_client.search_asset(nid=TEST_NID, sample_count=10)

        # Should have some results
        print(f"\nSimilar matches for {TEST_NID}:")
        for match in result.similar_matches:
            print(f"  - {match.nid}: distance={match.distance}")

        # Note: The presence of similar matches depends on the asset and index
        # We just verify the API responds correctly
        assert isinstance(result.similar_matches, list)


def test_full_workflow(capture_client):
    """
    Full workflow test: Get asset tree and verify all expected data.

    This test verifies:
    1. Asset tree contains creatorWallet: 0x019F590C900c78060da8597186d065ee514931BB
    2. Asset tree contains nftRecord: bafkreibjj4sgpeirznei5or3lncndzije6nw4qsksoomsbu23ivp7bdwei
    """
    print(f"\n{'=' * 60}")
    print("Full Workflow Test")
    print(f"{'=' * 60}")

    # Get asset tree
    tree = capture_client.get_asset_tree(TEST_NID)

    # Print all retrieved data
    print("\nAsset Tree Data:")
    print(f"  NID: {TEST_NID}")
    print(f"  Creator Wallet: {tree.creator_wallet}")
    print(f"  NFT Record: {tree.nft_record}")
    print(f"  Creator Name: {tree.creator_name}")
    print(f"  Mime Type: {tree.mime_type}")

    # Verify expected values
    print("\nVerification:")
    print(f"  Expected Creator Wallet: {EXPECTED_CREATOR_WALLET}")
    print(f"  Actual Creator Wallet:   {tree.creator_wallet}")
    print(f"  Match: {tree.creator_wallet == EXPECTED_CREATOR_WALLET}")

    print(f"\n  Expected NFT Record: {EXPECTED_NFT_RECORD}")
    print(f"  Actual NFT Record:   {tree.nft_record}")
    print(f"  Match: {tree.nft_record == EXPECTED_NFT_RECORD}")

    assert tree.creator_wallet == EXPECTED_CREATOR_WALLET
    assert tree.nft_record == EXPECTED_NFT_RECORD

    print(f"\n{'=' * 60}")
    print("All verifications passed!")
    print(f"{'=' * 60}")
