"""
Error classes for the Capture SDK.
"""



class CaptureError(Exception):
    """Base error class for all Capture SDK errors."""

    def __init__(
        self,
        message: str,
        code: str,
        status_code: int | None = None,
    ):
        super().__init__(message)
        self.message = message
        self.code = code
        self.status_code = status_code

    def __str__(self) -> str:
        return self.message

    def __repr__(self) -> str:
        return f"{self.__class__.__name__}({self.message!r}, code={self.code!r}, status_code={self.status_code!r})"


class AuthenticationError(CaptureError):
    """Thrown when authentication fails (invalid or missing token)."""

    def __init__(self, message: str = "Invalid or missing authentication token"):
        super().__init__(message, "AUTHENTICATION_ERROR", 401)


class PermissionError(CaptureError):
    """Thrown when user lacks permission for the requested operation."""

    def __init__(self, message: str = "Insufficient permissions for this operation"):
        super().__init__(message, "PERMISSION_ERROR", 403)


class NotFoundError(CaptureError):
    """Thrown when the requested asset is not found."""

    def __init__(self, nid: str | None = None):
        message = f"Asset not found: {nid}" if nid else "Asset not found"
        super().__init__(message, "NOT_FOUND", 404)
        self.nid = nid


class InsufficientFundsError(CaptureError):
    """Thrown when wallet has insufficient NUM tokens."""

    def __init__(self, message: str = "Insufficient NUM tokens for this operation"):
        super().__init__(message, "INSUFFICIENT_FUNDS", 400)


class ValidationError(CaptureError):
    """Thrown when input validation fails."""

    def __init__(self, message: str):
        super().__init__(message, "VALIDATION_ERROR")


class NetworkError(CaptureError):
    """Thrown when a network or API request fails."""

    def __init__(self, message: str, status_code: int | None = None):
        super().__init__(message, "NETWORK_ERROR", status_code)


def create_api_error(
    status_code: int,
    message: str,
    nid: str | None = None,
) -> CaptureError:
    """Maps HTTP status codes to appropriate error classes."""
    if status_code == 400:
        if "insufficient" in message.lower():
            return InsufficientFundsError(message)
        return ValidationError(message)
    elif status_code == 401:
        return AuthenticationError(message)
    elif status_code == 403:
        return PermissionError(message)
    elif status_code == 404:
        return NotFoundError(nid)
    else:
        return NetworkError(message, status_code)
