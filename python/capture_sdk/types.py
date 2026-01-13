"""
Type definitions for the Capture SDK.
"""

from dataclasses import dataclass, field
from typing import Any, Optional, Union
from pathlib import Path


# Flexible file input type - SDK handles all conversions internally
FileInput = Union[str, Path, bytes, bytearray]
"""
Supported file input types:
- str: File path
- Path: pathlib.Path object
- bytes: Binary data
- bytearray: Mutable binary data
"""


@dataclass
class CaptureOptions:
    """Configuration options for the Capture client."""

    token: str
    """Authentication token for API access."""

    testnet: bool = False
    """Use testnet environment (default: False)."""

    base_url: Optional[str] = None
    """Custom base URL (overrides testnet setting)."""


@dataclass
class SignOptions:
    """Options for signing asset registration."""

    private_key: str
    """Ethereum private key for EIP-191 signing."""


@dataclass
class RegisterOptions:
    """Options for registering a new asset."""

    filename: Optional[str] = None
    """Filename (required for bytes/bytearray inputs)."""

    caption: Optional[str] = None
    """Brief description of the asset."""

    headline: Optional[str] = None
    """Asset title (max 25 characters)."""

    public_access: bool = True
    """Pin to public IPFS gateway (default: True)."""

    sign: Optional[SignOptions] = None
    """Optional signing configuration."""


@dataclass
class UpdateOptions:
    """Options for updating an existing asset."""

    caption: Optional[str] = None
    """Updated description."""

    headline: Optional[str] = None
    """Updated title (max 25 characters)."""

    commit_message: Optional[str] = None
    """Description of the changes."""

    custom_metadata: Optional[dict[str, Any]] = None
    """Custom metadata fields."""


@dataclass
class Asset:
    """Registered asset information."""

    nid: str
    """Numbers ID (NID) - unique identifier."""

    filename: str
    """Original filename."""

    mime_type: str
    """MIME type of the asset."""

    caption: Optional[str] = None
    """Asset description."""

    headline: Optional[str] = None
    """Asset title."""


@dataclass
class Commit:
    """A single commit in the asset's history."""

    asset_tree_cid: str
    """CID of the asset tree at this commit."""

    tx_hash: str
    """Blockchain transaction hash."""

    author: str
    """Original creator's address."""

    committer: str
    """Address that made this commit."""

    timestamp: int
    """Unix timestamp of the commit."""

    action: str
    """Description of the action."""


@dataclass
class AssetTree:
    """Merged asset tree containing full provenance data."""

    asset_cid: Optional[str] = None
    """Asset content identifier."""

    asset_sha256: Optional[str] = None
    """SHA-256 hash of the asset."""

    creator_name: Optional[str] = None
    """Creator's name."""

    creator_wallet: Optional[str] = None
    """Creator's wallet address."""

    created_at: Optional[int] = None
    """Creation timestamp."""

    location_created: Optional[str] = None
    """Location where asset was created."""

    caption: Optional[str] = None
    """Asset description."""

    headline: Optional[str] = None
    """Asset title."""

    license: Optional[str] = None
    """License information."""

    mime_type: Optional[str] = None
    """MIME type."""

    extra: dict[str, Any] = field(default_factory=dict)
    """Additional fields from commits."""


# Internal types


@dataclass
class IntegrityProof:
    """Integrity proof for asset registration."""

    proof_hash: str
    asset_mime_type: str
    created_at: int


@dataclass
class AssetSignature:
    """Signature data for asset registration."""

    proof_hash: str
    provider: str
    signature: str
    public_key: str
    integrity_sha: str
