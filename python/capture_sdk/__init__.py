"""
Capture SDK - Python SDK for Numbers Protocol Capture API.

A developer-friendly SDK for registering and managing digital assets
with blockchain-backed provenance.

Example:
    >>> from capture_sdk import Capture
    >>> capture = Capture(token="your-api-token")
    >>> asset = capture.register("./photo.jpg", caption="My photo")
    >>> print(asset.nid)
"""

from .client import Capture
from .types import (
    FileInput,
    CaptureOptions,
    RegisterOptions,
    UpdateOptions,
    SignOptions,
    Asset,
    Commit,
    AssetTree,
)
from .errors import (
    CaptureError,
    AuthenticationError,
    PermissionError,
    NotFoundError,
    InsufficientFundsError,
    ValidationError,
    NetworkError,
)
from .crypto import sha256, verify_signature

__version__ = "0.1.0"

__all__ = [
    # Main client
    "Capture",
    # Types
    "FileInput",
    "CaptureOptions",
    "RegisterOptions",
    "UpdateOptions",
    "SignOptions",
    "Asset",
    "Commit",
    "AssetTree",
    # Errors
    "CaptureError",
    "AuthenticationError",
    "PermissionError",
    "NotFoundError",
    "InsufficientFundsError",
    "ValidationError",
    "NetworkError",
    # Utilities
    "sha256",
    "verify_signature",
]
