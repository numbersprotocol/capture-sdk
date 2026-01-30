"""
Unit tests for asset search (Verify Engine) functionality.

These tests verify that the SDK correctly parses asset search responses
with precise matches and similar matches.
"""

import pytest
import respx
from httpx import Response

from numbersprotocol_capture import Capture
from numbersprotocol_capture.types import AssetSearchResult, SimilarMatch

# Test asset NID
TEST_NID = "bafybeif3mhxhkhfwuszl2lybtai3hz3q6naqpfisd4q55mcc7opkmiv5ei"

# Mock API URL
ASSET_SEARCH_API_URL = "https://us-central1-numbers-protocol-api.cloudfunctions.net/asset-search"


@pytest.fixture
def capture_client():
    """Create a Capture client with test token."""
    return Capture(token="test-token")


@pytest.fixture
def mock_search_response_exact_match():
    """Mock response with exact match."""
    return {
        "precise_match": TEST_NID,
        "input_file_mime_type": "image/png",
        "similar_matches": [
            {"nid": "bafybei111", "distance": 0.05},
            {"nid": "bafybei222", "distance": 0.12},
            {"nid": "bafybei333", "distance": 0.18},
        ],
        "order_id": "order_123",
    }


@pytest.fixture
def mock_search_response_similar_only():
    """Mock response with similar matches only (no exact match)."""
    return {
        "precise_match": "",
        "input_file_mime_type": "image/jpeg",
        "similar_matches": [
            {"nid": TEST_NID, "distance": 0.02},
            {"nid": "bafybei444", "distance": 0.15},
            {"nid": "bafybei555", "distance": 0.22},
        ],
        "order_id": "order_456",
    }


class TestAssetSearchParsing:
    """Tests for asset search response parsing."""

    @respx.mock
    def test_search_asset_returns_precise_match(
        self,
        capture_client,
        mock_search_response_exact_match,
    ):
        """Verify precise_match is correctly parsed from API response."""
        respx.post(ASSET_SEARCH_API_URL).mock(
            return_value=Response(200, json=mock_search_response_exact_match)
        )

        result = capture_client.search_asset(nid=TEST_NID)

        assert result.precise_match == TEST_NID

    @respx.mock
    def test_search_asset_returns_similar_matches(
        self,
        capture_client,
        mock_search_response_exact_match,
    ):
        """Verify similar_matches is correctly parsed from API response."""
        respx.post(ASSET_SEARCH_API_URL).mock(
            return_value=Response(200, json=mock_search_response_exact_match)
        )

        result = capture_client.search_asset(nid=TEST_NID)

        assert len(result.similar_matches) == 3
        assert result.similar_matches[0].nid == "bafybei111"
        assert result.similar_matches[0].distance == 0.05

    @respx.mock
    def test_search_asset_finds_nid_in_similar_matches(
        self,
        capture_client,
        mock_search_response_similar_only,
    ):
        """Verify search finds the expected NID in similar matches."""
        respx.post(ASSET_SEARCH_API_URL).mock(
            return_value=Response(200, json=mock_search_response_similar_only)
        )

        result = capture_client.search_asset(nid=TEST_NID)

        # Find the expected NID in similar matches
        matching_nids = [m.nid for m in result.similar_matches]
        assert TEST_NID in matching_nids

    @respx.mock
    def test_search_asset_returns_order_id(
        self,
        capture_client,
        mock_search_response_exact_match,
    ):
        """Verify order_id is correctly parsed from API response."""
        respx.post(ASSET_SEARCH_API_URL).mock(
            return_value=Response(200, json=mock_search_response_exact_match)
        )

        result = capture_client.search_asset(nid=TEST_NID)

        assert result.order_id == "order_123"

    @respx.mock
    def test_search_asset_returns_mime_type(
        self,
        capture_client,
        mock_search_response_exact_match,
    ):
        """Verify input_file_mime_type is correctly parsed from API response."""
        respx.post(ASSET_SEARCH_API_URL).mock(
            return_value=Response(200, json=mock_search_response_exact_match)
        )

        result = capture_client.search_asset(nid=TEST_NID)

        assert result.input_file_mime_type == "image/png"

    @respx.mock
    def test_search_asset_includes_other_similar_assets(
        self,
        capture_client,
        mock_search_response_similar_only,
    ):
        """Verify search includes other similar assets besides the exact match."""
        respx.post(ASSET_SEARCH_API_URL).mock(
            return_value=Response(200, json=mock_search_response_similar_only)
        )

        result = capture_client.search_asset(nid=TEST_NID)

        # Filter out the exact match
        other_matches = [m for m in result.similar_matches if m.nid != TEST_NID]
        assert len(other_matches) > 0
        assert "bafybei444" in [m.nid for m in other_matches]

    @respx.mock
    def test_search_asset_handles_empty_similar_matches(
        self,
        capture_client,
    ):
        """Verify SDK handles empty similar_matches gracefully."""
        response_empty = {
            "precise_match": TEST_NID,
            "input_file_mime_type": "image/png",
            "similar_matches": [],
            "order_id": "order_789",
        }

        respx.post(ASSET_SEARCH_API_URL).mock(
            return_value=Response(200, json=response_empty)
        )

        result = capture_client.search_asset(nid=TEST_NID)

        assert result.precise_match == TEST_NID
        assert len(result.similar_matches) == 0


class TestAssetSearchTypes:
    """Tests for asset search types."""

    def test_asset_search_result_has_all_fields(self):
        """Verify AssetSearchResult has all required fields."""
        result = AssetSearchResult(
            precise_match=TEST_NID,
            input_file_mime_type="image/png",
            similar_matches=[
                SimilarMatch(nid="bafybei111", distance=0.05),
            ],
            order_id="order_123",
        )

        assert result.precise_match == TEST_NID
        assert result.input_file_mime_type == "image/png"
        assert len(result.similar_matches) == 1
        assert result.order_id == "order_123"

    def test_similar_match_has_nid_and_distance(self):
        """Verify SimilarMatch has nid and distance fields."""
        match = SimilarMatch(nid=TEST_NID, distance=0.05)

        assert match.nid == TEST_NID
        assert match.distance == 0.05


class TestAssetSearchValidation:
    """Tests for asset search input validation."""

    def test_search_asset_requires_input_source(self, capture_client):
        """Verify search_asset raises error when no input source is provided."""
        from numbersprotocol_capture.errors import ValidationError

        with pytest.raises(
            ValidationError,
            match="Must provide file_url, file, or nid for asset search",
        ):
            capture_client.search_asset()

    def test_search_asset_validates_threshold(self, capture_client):
        """Verify search_asset validates threshold range."""
        from numbersprotocol_capture.errors import ValidationError

        with pytest.raises(
            ValidationError,
            match="threshold must be between 0 and 1",
        ):
            capture_client.search_asset(nid=TEST_NID, threshold=1.5)

    def test_search_asset_validates_sample_count(self, capture_client):
        """Verify search_asset validates sample_count is positive."""
        from numbersprotocol_capture.errors import ValidationError

        with pytest.raises(
            ValidationError,
            match="sample_count must be a positive integer",
        ):
            capture_client.search_asset(nid=TEST_NID, sample_count=0)
