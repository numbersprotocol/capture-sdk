"""
Type definitions for the Capture SDK.
"""

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

# Flexible file input type - SDK handles all conversions internally
FileInput = str | Path | bytes | bytearray
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

    base_url: str | None = None
    """Custom base URL (overrides testnet setting)."""


@dataclass
class SignOptions:
    """Options for signing asset registration."""

    private_key: str
    """Ethereum private key for EIP-191 signing."""


@dataclass
class RegisterOptions:
    """Options for registering a new asset."""

    filename: str | None = None
    """Filename (required for bytes/bytearray inputs)."""

    caption: str | None = None
    """Brief description of the asset."""

    headline: str | None = None
    """Asset title (max 25 characters)."""

    public_access: bool = True
    """Pin to public IPFS gateway (default: True)."""

    sign: SignOptions | None = None
    """Optional signing configuration."""


@dataclass
class UpdateOptions:
    """Options for updating an existing asset."""

    caption: str | None = None
    """Updated description."""

    headline: str | None = None
    """Updated title (max 25 characters)."""

    commit_message: str | None = None
    """Description of the changes."""

    custom_metadata: dict[str, Any] | None = None
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

    caption: str | None = None
    """Asset description."""

    headline: str | None = None
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
class License:
    """License information for an asset."""

    name: str | None = None
    """License name (e.g., 'CC BY 4.0')."""

    document: str | None = None
    """URL to the license document."""


@dataclass
class AssetTree:
    """
    Merged asset tree containing full provenance data.

    Follows the Numbers Protocol AssetTree specification.
    See: https://docs.numbersprotocol.io/introduction/numbers-protocol/defining-web3-assets/assettree
    """

    asset_cid: str | None = None
    """Asset content identifier (IPFS CID)."""

    asset_sha256: str | None = None
    """SHA-256 hash of the asset file."""

    creator_name: str | None = None
    """Creator's name."""

    creator_wallet: str | None = None
    """Creator's wallet address."""

    created_at: int | None = None
    """Unix timestamp when asset was created."""

    location_created: str | None = None
    """Location where asset was created."""

    caption: str | None = None
    """Asset description/abstract."""

    headline: str | None = None
    """Asset title."""

    license: License | None = None
    """License information."""

    mime_type: str | None = None
    """MIME type (encodingFormat)."""

    nft_record: str | None = None
    """NFT record CID (if asset has been minted as NFT)."""

    used_by: str | None = None
    """URL of website that uses the asset."""

    integrity_cid: str | None = None
    """IPFS CID of the integrity proof."""

    digital_source_type: str | None = None
    """Digital source type (e.g., digitalCapture, trainedAlgorithmicMedia)."""

    mining_preference: str | None = None
    """Mining/indexing preference."""

    generated_by: str | None = None
    """AI/algorithm information for generated content."""

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


# Verify Engine types


@dataclass
class AssetSearchOptions:
    """Options for searching similar assets."""

    file_url: str | None = None
    """URL of the file to search."""

    file: FileInput | None = None
    """File to search (path, Path, bytes, or bytearray)."""

    nid: str | None = None
    """Numbers ID of an existing asset to search."""

    threshold: float | None = None
    """Similarity threshold (0-1, lower means more similar)."""

    sample_count: int | None = None
    """Number of results to return."""


@dataclass
class SimilarMatch:
    """A similar asset match from the search results."""

    nid: str
    """Numbers ID of the matched asset."""

    distance: float
    """Distance score (lower means more similar)."""


@dataclass
class AssetSearchResult:
    """Result of an asset search operation."""

    precise_match: str
    """NID of the exact match (empty if none)."""

    input_file_mime_type: str
    """MIME type of the input file."""

    similar_matches: list["SimilarMatch"]
    """List of similar asset matches."""

    order_id: str
    """Order ID for the search transaction."""


@dataclass
class NftRecord:
    """An NFT record from the NFT search results."""

    token_id: str
    """NFT token ID."""

    contract: str
    """Smart contract address."""

    network: str
    """Blockchain network (e.g., 'ethereum', 'polygon')."""

    owner: str | None = None
    """Owner's wallet address."""


@dataclass
class NftSearchResult:
    """Result of an NFT search operation."""

    records: list["NftRecord"]
    """List of NFT records found."""

    order_id: str
    """Order ID for the search transaction."""
