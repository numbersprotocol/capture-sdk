"""
Unit tests for Verify Engine URL helpers.
"""

import pytest

from numbersprotocol_capture.verify import (
    VERIFY_BASE_URL,
    asset_profile,
    asset_profile_by_nft,
    search_by_nft,
    search_by_nid,
)

NORMAL_NID = "bafybeif3mhxhkhfwuszl2lybtai3hz3q6naqpfisd4q55mcc7opkmiv5ei"


class TestSearchByNid:
    def test_normal_nid(self):
        url = search_by_nid(NORMAL_NID)
        assert url == f"{VERIFY_BASE_URL}/search?nid={NORMAL_NID}"

    def test_special_characters_are_encoded(self):
        url = search_by_nid("nid with spaces&param=injected")
        assert " " not in url
        assert "&param=injected" not in url
        assert url == f"{VERIFY_BASE_URL}/search?nid=nid%20with%20spaces%26param%3Dinjected"

    def test_hash_character_is_encoded(self):
        url = search_by_nid("nid#fragment")
        assert "#" not in url
        assert url == f"{VERIFY_BASE_URL}/search?nid=nid%23fragment"


class TestAssetProfile:
    def test_normal_nid(self):
        url = asset_profile(NORMAL_NID)
        assert url == f"{VERIFY_BASE_URL}/asset-profile?nid={NORMAL_NID}"

    def test_special_characters_are_encoded(self):
        url = asset_profile("nid with spaces&param=injected")
        assert " " not in url
        assert "&param=injected" not in url
        assert url == f"{VERIFY_BASE_URL}/asset-profile?nid=nid%20with%20spaces%26param%3Dinjected"

    def test_hash_character_is_encoded(self):
        url = asset_profile("nid#fragment")
        assert "#" not in url
        assert url == f"{VERIFY_BASE_URL}/asset-profile?nid=nid%23fragment"


class TestSearchByNft:
    def test_normal_nft(self):
        url = search_by_nft("123", "0x1234abcd")
        assert url == f"{VERIFY_BASE_URL}/search?nft=123&contract=0x1234abcd"

    def test_special_characters_are_encoded(self):
        url = search_by_nft("token id with space", "0x1234")
        assert "token+id+with+space" in url or "token%20id%20with%20space" in url


class TestAssetProfileByNft:
    def test_normal_nft(self):
        url = asset_profile_by_nft("123", "0x1234abcd")
        assert url == f"{VERIFY_BASE_URL}/asset-profile?nft=123&contract=0x1234abcd"

    def test_special_characters_are_encoded(self):
        url = asset_profile_by_nft("token id with space", "0x1234")
        assert "token+id+with+space" in url or "token%20id%20with%20space" in url
