"""Tests for the Verify Engine URL helpers."""

from numbersprotocol_capture import verify
from numbersprotocol_capture.verify import VERIFY_BASE_URL

TEST_NID = "bafybeif3mhxhkhfwuszl2lybtai3hz3q6naqpfisd4q55mcc7opkmiv5ei"


class TestSearchByNid:
    def test_returns_correct_url(self) -> None:
        url = verify.search_by_nid(TEST_NID)
        assert url == f"{VERIFY_BASE_URL}/search?nid={TEST_NID}"

    def test_includes_nid_in_url(self) -> None:
        url = verify.search_by_nid("some-nid")
        assert "some-nid" in url
        assert "/search" in url


class TestSearchByNft:
    def test_returns_correct_url(self) -> None:
        url = verify.search_by_nft("123", "0xabc")
        assert url == f"{VERIFY_BASE_URL}/search?nft=123&contract=0xabc"

    def test_url_encodes_params(self) -> None:
        url = verify.search_by_nft("token id", "0x contract")
        assert "token+id" in url or "token%20id" in url


class TestAssetProfile:
    def test_returns_correct_url(self) -> None:
        url = verify.asset_profile(TEST_NID)
        assert url == f"{VERIFY_BASE_URL}/asset-profile?nid={TEST_NID}"

    def test_includes_nid_in_url(self) -> None:
        url = verify.asset_profile("some-nid")
        assert "some-nid" in url
        assert "asset-profile" in url


class TestAssetProfileByNft:
    def test_returns_correct_url(self) -> None:
        url = verify.asset_profile_by_nft("42", "0xdef")
        assert url == f"{VERIFY_BASE_URL}/asset-profile?nft=42&contract=0xdef"

    def test_url_encodes_params(self) -> None:
        url = verify.asset_profile_by_nft("token id", "0x contract")
        assert "token+id" in url or "token%20id" in url
