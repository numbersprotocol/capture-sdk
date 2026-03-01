"""
Numbers Protocol Capture SDK - Python SDK for Numbers Protocol Capture API.

A developer-friendly SDK for registering and managing digital assets
with blockchain-backed provenance.

Example:
    >>> from numbersprotocol_capture import Capture
    >>> capture = Capture(token="your-api-token")
    >>> asset = capture.register("./photo.jpg", caption="My photo")
    >>> print(asset.nid)
"""

from . import verify
from .client import AsyncCapture, Capture
from .crypto import sha256, verify_signature
from .errors import (
    AuthenticationError,
    CaptureError,
    InsufficientFundsError,
    NetworkError,
    NotFoundError,
    PermissionError,
    ValidationError,
)
from .types import (
    Asset,
    AssetSearchOptions,
    AssetSearchResult,
    AssetTree,
    CaptureOptions,
    Commit,
    FileInput,
    License,
    NftRecord,
    NftSearchResult,
    RegisterOptions,
    SignOptions,
    SimilarMatch,
    UpdateOptions,
)

__version__ = "0.2.1"

__all__ = [
    # Main clients
    "Capture",
    "AsyncCapture",
    # Types
    "FileInput",
    "CaptureOptions",
    "RegisterOptions",
    "UpdateOptions",
    "SignOptions",
    "Asset",
    "Commit",
    "AssetTree",
    "License",
    "AssetSearchOptions",
    "AssetSearchResult",
    "SimilarMatch",
    "NftSearchResult",
    "NftRecord",
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
    # Verify Engine helpers
    "verify",
]
