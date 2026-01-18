"""Tests for error classes."""

from capture_sdk import (
    AuthenticationError,
    CaptureError,
    InsufficientFundsError,
    NetworkError,
    NotFoundError,
    PermissionError,
    ValidationError,
)
from capture_sdk.errors import create_api_error


class TestErrorClasses:
    """Tests for error class definitions."""

    def test_capture_error(self) -> None:
        """Test base CaptureError."""
        error = CaptureError("Test error", "TEST_CODE", 500)
        assert str(error) == "Test error"
        assert error.code == "TEST_CODE"
        assert error.status_code == 500

    def test_authentication_error(self) -> None:
        """Test AuthenticationError."""
        error = AuthenticationError()
        assert "authentication token" in str(error).lower()
        assert error.code == "AUTHENTICATION_ERROR"
        assert error.status_code == 401

    def test_permission_error(self) -> None:
        """Test PermissionError."""
        error = PermissionError()
        assert "permission" in str(error).lower()
        assert error.code == "PERMISSION_ERROR"
        assert error.status_code == 403

    def test_not_found_error_without_nid(self) -> None:
        """Test NotFoundError without NID."""
        error = NotFoundError()
        assert "not found" in str(error).lower()
        assert error.code == "NOT_FOUND"
        assert error.status_code == 404

    def test_not_found_error_with_nid(self) -> None:
        """Test NotFoundError with NID."""
        error = NotFoundError("bafybei123")
        assert "bafybei123" in str(error)
        assert error.nid == "bafybei123"

    def test_insufficient_funds_error(self) -> None:
        """Test InsufficientFundsError."""
        error = InsufficientFundsError()
        assert "insufficient" in str(error).lower()
        assert error.code == "INSUFFICIENT_FUNDS"
        assert error.status_code == 400

    def test_validation_error(self) -> None:
        """Test ValidationError."""
        error = ValidationError("Invalid input")
        assert str(error) == "Invalid input"
        assert error.code == "VALIDATION_ERROR"
        assert error.status_code is None

    def test_network_error(self) -> None:
        """Test NetworkError."""
        error = NetworkError("Connection failed", 503)
        assert str(error) == "Connection failed"
        assert error.code == "NETWORK_ERROR"
        assert error.status_code == 503


class TestCreateApiError:
    """Tests for create_api_error helper."""

    def test_400_insufficient(self) -> None:
        """Test 400 with insufficient keyword maps to InsufficientFundsError."""
        error = create_api_error(400, "Insufficient NUM tokens")
        assert isinstance(error, InsufficientFundsError)

    def test_400_other(self) -> None:
        """Test 400 without insufficient keyword maps to ValidationError."""
        error = create_api_error(400, "Invalid request")
        assert isinstance(error, ValidationError)

    def test_401(self) -> None:
        """Test 401 maps to AuthenticationError."""
        error = create_api_error(401, "Unauthorized")
        assert isinstance(error, AuthenticationError)

    def test_403(self) -> None:
        """Test 403 maps to PermissionError."""
        error = create_api_error(403, "Forbidden")
        assert isinstance(error, PermissionError)

    def test_404(self) -> None:
        """Test 404 maps to NotFoundError."""
        error = create_api_error(404, "Not found", "bafybei123")
        assert isinstance(error, NotFoundError)
        assert error.nid == "bafybei123"

    def test_500(self) -> None:
        """Test 500 maps to NetworkError."""
        error = create_api_error(500, "Internal server error")
        assert isinstance(error, NetworkError)
        assert error.status_code == 500
