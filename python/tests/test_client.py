"""Tests for the Capture client."""

import pytest

from numbersprotocol_capture import Capture, ValidationError


class TestCaptureClient:
    """Tests for Capture client initialization."""

    def test_init_with_token(self) -> None:
        """Test client initialization with token."""
        capture = Capture(token="test-token")
        assert capture._token == "test-token"
        assert capture._testnet is False
        capture.close()

    def test_init_without_token_raises_error(self) -> None:
        """Test that missing token raises ValidationError."""
        with pytest.raises(ValidationError, match="token is required"):
            Capture(token="")

    def test_init_with_testnet(self) -> None:
        """Test client initialization with testnet flag."""
        capture = Capture(token="test-token", testnet=True)
        assert capture._testnet is True
        capture.close()

    def test_init_with_custom_base_url(self) -> None:
        """Test client initialization with custom base URL."""
        capture = Capture(token="test-token", base_url="https://custom.api.com")
        assert capture._base_url == "https://custom.api.com"
        capture.close()

    def test_context_manager(self) -> None:
        """Test client as context manager."""
        with Capture(token="test-token") as capture:
            assert capture._token == "test-token"


class TestValidation:
    """Tests for input validation."""

    def test_register_empty_file_raises_error(self, tmp_path) -> None:
        """Test that empty file raises ValidationError."""
        empty_file = tmp_path / "empty.txt"
        empty_file.write_bytes(b"")

        with Capture(token="test-token") as capture:
            with pytest.raises(ValidationError, match="file cannot be empty"):
                capture.register(str(empty_file))

    def test_register_headline_too_long_raises_error(self, tmp_path) -> None:
        """Test that headline over 25 chars raises ValidationError."""
        test_file = tmp_path / "test.txt"
        test_file.write_bytes(b"test content")

        with Capture(token="test-token") as capture:
            with pytest.raises(ValidationError, match="headline must be 25 characters or less"):
                capture.register(str(test_file), headline="a" * 30)

    def test_register_binary_without_filename_raises_error(self) -> None:
        """Test that binary input without filename raises ValidationError."""
        with Capture(token="test-token") as capture:
            with pytest.raises(ValidationError, match="filename is required"):
                capture.register(b"test content")

    def test_get_empty_nid_raises_error(self) -> None:
        """Test that empty NID raises ValidationError."""
        with Capture(token="test-token") as capture:
            with pytest.raises(ValidationError, match="nid is required"):
                capture.get("")

    def test_update_empty_nid_raises_error(self) -> None:
        """Test that empty NID raises ValidationError."""
        with Capture(token="test-token") as capture:
            with pytest.raises(ValidationError, match="nid is required"):
                capture.update("", caption="test")


class TestNidFormatValidation:
    """Tests for NID format validation (path traversal prevention)."""

    def test_get_rejects_path_traversal_nid(self) -> None:
        """Test that nid with path traversal characters is rejected."""
        with Capture(token="test-token") as capture:
            with pytest.raises(ValidationError, match="nid contains invalid characters"):
                capture.get("../../admin/users")

    def test_update_rejects_path_traversal_nid(self) -> None:
        """Test that nid with path traversal characters is rejected in update."""
        with Capture(token="test-token") as capture:
            with pytest.raises(ValidationError, match="nid contains invalid characters"):
                capture.update("../../admin/users", caption="x")

    def test_get_rejects_nid_with_url_special_chars(self) -> None:
        """Test that nid with URL-special characters is rejected."""
        with Capture(token="test-token") as capture:
            with pytest.raises(ValidationError, match="nid contains invalid characters"):
                capture.get("bafybei?inject=1")
            with pytest.raises(ValidationError, match="nid contains invalid characters"):
                capture.get("bafybei#fragment")

    def test_get_accepts_valid_alphanumeric_nid(self) -> None:
        """Test that a valid alphanumeric NID passes format validation."""
        valid_nid = "bafybeif3mhxhkhfwuszl2lybtai3hz3q6naqpfisd4q55mcc7opkmiv5ei"
        with Capture(token="test-token") as capture:
            # Should not raise ValidationError for format; will fail at network level
            with pytest.raises(Exception) as exc_info:
                capture.get(valid_nid)
            assert "nid contains invalid characters" not in str(exc_info.value)
