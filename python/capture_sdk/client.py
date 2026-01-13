"""
Main Capture SDK client.
"""

import json
import mimetypes
from pathlib import Path
from typing import Any, Optional, Union
from urllib.parse import urlencode

import httpx

from .types import (
    FileInput,
    CaptureOptions,
    RegisterOptions,
    UpdateOptions,
    Asset,
    Commit,
    AssetTree,
)
from .errors import ValidationError, CaptureError, create_api_error
from .crypto import sha256, create_integrity_proof, sign_integrity_proof


DEFAULT_BASE_URL = "https://api.numbersprotocol.io/api/v3"
HISTORY_API_URL = "https://e23hi68y55.execute-api.us-east-1.amazonaws.com/default/get-commits-storage-backend-jade-near"
MERGE_TREE_API_URL = "https://us-central1-numbers-protocol-api.cloudfunctions.net/get-full-asset-tree"

# Common MIME types by extension
MIME_TYPES: dict[str, str] = {
    "jpg": "image/jpeg",
    "jpeg": "image/jpeg",
    "png": "image/png",
    "gif": "image/gif",
    "webp": "image/webp",
    "svg": "image/svg+xml",
    "mp4": "video/mp4",
    "webm": "video/webm",
    "mov": "video/quicktime",
    "mp3": "audio/mpeg",
    "wav": "audio/wav",
    "pdf": "application/pdf",
    "json": "application/json",
    "txt": "text/plain",
}


def _get_mime_type(filename: str) -> str:
    """Detects MIME type from filename extension."""
    ext = Path(filename).suffix.lower().lstrip(".")
    if ext in MIME_TYPES:
        return MIME_TYPES[ext]
    # Try system mimetypes
    mime_type, _ = mimetypes.guess_type(filename)
    return mime_type or "application/octet-stream"


def _normalize_file(
    file_input: FileInput,
    options: Optional[RegisterOptions] = None,
) -> tuple[bytes, str, str]:
    """
    Normalizes various file input types to a common format.

    Returns:
        Tuple of (data, filename, mime_type)
    """
    # 1. String path
    if isinstance(file_input, str):
        path = Path(file_input)
        if not path.exists():
            raise ValidationError(f"File not found: {file_input}")
        data = path.read_bytes()
        filename = path.name
        mime_type = _get_mime_type(filename)
        return data, filename, mime_type

    # 2. Path object
    if isinstance(file_input, Path):
        if not file_input.exists():
            raise ValidationError(f"File not found: {file_input}")
        data = file_input.read_bytes()
        filename = file_input.name
        mime_type = _get_mime_type(filename)
        return data, filename, mime_type

    # 3. bytes or bytearray
    if isinstance(file_input, (bytes, bytearray)):
        if not options or not options.filename:
            raise ValidationError("filename is required for binary input")
        data = bytes(file_input)
        filename = options.filename
        mime_type = _get_mime_type(filename)
        return data, filename, mime_type

    raise ValidationError(f"Unsupported file input type: {type(file_input)}")


def _to_asset(response: dict[str, Any]) -> Asset:
    """Converts API response to Asset type."""
    return Asset(
        nid=response["id"],
        filename=response["asset_file_name"],
        mime_type=response["asset_file_mime_type"],
        caption=response.get("caption"),
        headline=response.get("headline"),
    )


class Capture:
    """
    Main Capture SDK client.

    Example:
        >>> from capture_sdk import Capture
        >>> capture = Capture(token="your-api-token")
        >>> asset = capture.register("./photo.jpg", caption="My photo")
        >>> print(asset.nid)
    """

    def __init__(
        self,
        token: Optional[str] = None,
        *,
        testnet: bool = False,
        base_url: Optional[str] = None,
        options: Optional[CaptureOptions] = None,
    ):
        """
        Initialize the Capture client.

        Args:
            token: Authentication token for API access.
            testnet: Use testnet environment (default: False).
            base_url: Custom base URL (overrides testnet setting).
            options: CaptureOptions object (alternative to individual args).
        """
        if options:
            token = options.token
            testnet = options.testnet
            base_url = options.base_url

        if not token:
            raise ValidationError("token is required")

        self._token = token
        self._testnet = testnet
        self._base_url = base_url or DEFAULT_BASE_URL
        self._client = httpx.Client(timeout=30.0)

    def __enter__(self) -> "Capture":
        return self

    def __exit__(self, *args: Any) -> None:
        self.close()

    def close(self) -> None:
        """Close the HTTP client."""
        self._client.close()

    def _request(
        self,
        method: str,
        url: str,
        *,
        data: Optional[dict[str, Any]] = None,
        files: Optional[dict[str, Any]] = None,
        json_body: Optional[dict[str, Any]] = None,
        nid: Optional[str] = None,
    ) -> dict[str, Any]:
        """Makes an authenticated API request."""
        headers = {"Authorization": f"token {self._token}"}

        try:
            if files:
                response = self._client.request(
                    method,
                    url,
                    headers=headers,
                    data=data,
                    files=files,
                )
            elif json_body:
                headers["Content-Type"] = "application/json"
                response = self._client.request(
                    method,
                    url,
                    headers=headers,
                    json=json_body,
                )
            else:
                response = self._client.request(
                    method,
                    url,
                    headers=headers,
                    data=data,
                )
        except httpx.RequestError as e:
            raise create_api_error(0, f"Network error: {e}", nid) from e

        if not response.is_success:
            message = f"API request failed with status {response.status_code}"
            try:
                error_data = response.json()
                message = error_data.get("detail") or error_data.get("message") or message
            except Exception:
                pass
            raise create_api_error(response.status_code, message, nid)

        return response.json()

    def register(
        self,
        file: FileInput,
        *,
        filename: Optional[str] = None,
        caption: Optional[str] = None,
        headline: Optional[str] = None,
        public_access: bool = True,
        sign: Optional[dict[str, str]] = None,
        options: Optional[RegisterOptions] = None,
    ) -> Asset:
        """
        Registers a new asset.

        Args:
            file: File to register (path, Path, bytes, or bytearray).
            filename: Filename (required for bytes/bytearray inputs).
            caption: Brief description of the asset.
            headline: Asset title (max 25 characters).
            public_access: Pin to public IPFS gateway (default: True).
            sign: Signing configuration with 'private_key' key.
            options: RegisterOptions object (alternative to individual args).

        Returns:
            Registered Asset information.

        Example:
            >>> # File path
            >>> asset = capture.register("./photo.jpg")
            >>>
            >>> # With options
            >>> asset = capture.register(
            ...     "./photo.jpg",
            ...     caption="My photo",
            ...     headline="Demo"
            ... )
            >>>
            >>> # Binary data
            >>> asset = capture.register(
            ...     image_bytes,
            ...     filename="image.png"
            ... )
        """
        # Build options from args if not provided
        if options is None:
            from .types import SignOptions

            sign_opts = SignOptions(private_key=sign["private_key"]) if sign else None
            options = RegisterOptions(
                filename=filename,
                caption=caption,
                headline=headline,
                public_access=public_access,
                sign=sign_opts,
            )

        # Validate headline length
        if options.headline and len(options.headline) > 25:
            raise ValidationError("headline must be 25 characters or less")

        # Normalize file input
        data, file_name, mime_type = _normalize_file(file, options)

        if len(data) == 0:
            raise ValidationError("file cannot be empty")

        # Build form data
        form_data: dict[str, Any] = {
            "public_access": str(options.public_access).lower(),
        }

        if options.caption:
            form_data["caption"] = options.caption
        if options.headline:
            form_data["headline"] = options.headline

        # Handle signing if private key provided
        if options.sign and options.sign.private_key:
            proof_hash = sha256(data)
            proof = create_integrity_proof(proof_hash, mime_type)
            signature = sign_integrity_proof(proof, options.sign.private_key)

            proof_dict = {
                "proof_hash": proof.proof_hash,
                "asset_mime_type": proof.asset_mime_type,
                "created_at": proof.created_at,
            }
            form_data["signed_metadata"] = json.dumps(proof_dict)

            sig_dict = {
                "proofHash": signature.proof_hash,
                "provider": signature.provider,
                "signature": signature.signature,
                "publicKey": signature.public_key,
                "integritySha": signature.integrity_sha,
            }
            form_data["signature"] = json.dumps([sig_dict])

        files = {"asset_file": (file_name, data, mime_type)}

        response = self._request(
            "POST",
            f"{self._base_url}/assets/",
            data=form_data,
            files=files,
        )

        return _to_asset(response)

    def update(
        self,
        nid: str,
        *,
        caption: Optional[str] = None,
        headline: Optional[str] = None,
        commit_message: Optional[str] = None,
        custom_metadata: Optional[dict[str, Any]] = None,
        options: Optional[UpdateOptions] = None,
    ) -> Asset:
        """
        Updates an existing asset's metadata.

        Args:
            nid: Numbers ID of the asset to update.
            caption: Updated description.
            headline: Updated title (max 25 characters).
            commit_message: Description of the changes.
            custom_metadata: Custom metadata fields.
            options: UpdateOptions object (alternative to individual args).

        Returns:
            Updated Asset information.

        Example:
            >>> updated = capture.update(
            ...     asset.nid,
            ...     caption="Updated caption",
            ...     commit_message="Fixed typo in caption"
            ... )
        """
        if not nid:
            raise ValidationError("nid is required")

        # Build options from args if not provided
        if options is None:
            options = UpdateOptions(
                caption=caption,
                headline=headline,
                commit_message=commit_message,
                custom_metadata=custom_metadata,
            )

        if options.headline and len(options.headline) > 25:
            raise ValidationError("headline must be 25 characters or less")

        form_data: dict[str, Any] = {}

        if options.caption is not None:
            form_data["caption"] = options.caption
        if options.headline is not None:
            form_data["headline"] = options.headline
        if options.commit_message:
            form_data["commit_message"] = options.commit_message
        if options.custom_metadata:
            form_data["nit_commit_custom"] = json.dumps(options.custom_metadata)

        response = self._request(
            "PATCH",
            f"{self._base_url}/assets/{nid}/",
            data=form_data,
            nid=nid,
        )

        return _to_asset(response)

    def get(self, nid: str) -> Asset:
        """
        Retrieves a single asset by NID.

        Args:
            nid: Numbers ID of the asset.

        Returns:
            Asset information.

        Example:
            >>> asset = capture.get("bafybei...")
            >>> print(f"Filename: {asset.filename}")
            >>> print(f"Caption: {asset.caption}")
        """
        if not nid:
            raise ValidationError("nid is required")

        response = self._request(
            "GET",
            f"{self._base_url}/assets/{nid}/",
            nid=nid,
        )

        return _to_asset(response)

    def get_history(self, nid: str) -> list[Commit]:
        """
        Retrieves the commit history of an asset.

        Args:
            nid: Numbers ID of the asset.

        Returns:
            List of Commit objects.

        Example:
            >>> history = capture.get_history("bafybei...")
            >>> for commit in history:
            ...     print(f"Action: {commit.action}")
            ...     print(f"Author: {commit.author}")
        """
        if not nid:
            raise ValidationError("nid is required")

        params = {"nid": nid}
        if self._testnet:
            params["testnet"] = "true"

        url = f"{HISTORY_API_URL}?{urlencode(params)}"

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"token {self._token}",
        }

        try:
            response = self._client.get(url, headers=headers)
        except httpx.RequestError as e:
            raise create_api_error(0, f"Network error: {e}", nid) from e

        if not response.is_success:
            raise create_api_error(
                response.status_code,
                "Failed to fetch asset history",
                nid,
            )

        data = response.json()

        return [
            Commit(
                asset_tree_cid=c["assetTreeCid"],
                tx_hash=c["txHash"],
                author=c["author"],
                committer=c["committer"],
                timestamp=c["timestampCreated"],
                action=c["action"],
            )
            for c in data["commits"]
        ]

    def get_asset_tree(self, nid: str) -> AssetTree:
        """
        Retrieves the merged asset tree containing full provenance data.
        Combines all commits in chronological order.

        Args:
            nid: Numbers ID of the asset.

        Returns:
            Merged AssetTree.

        Example:
            >>> tree = capture.get_asset_tree(asset.nid)
            >>> print(f"Creator: {tree.creator_name}")
            >>> print(f"Created at: {tree.created_at}")
        """
        if not nid:
            raise ValidationError("nid is required")

        # First, get the commit history
        commits = self.get_history(nid)

        if len(commits) == 0:
            raise CaptureError("No commits found for asset", "NO_COMMITS", 404)

        # Prepare the request body for merging
        commit_data = [
            {
                "assetTreeCid": c.asset_tree_cid,
                "timestampCreated": c.timestamp,
            }
            for c in commits
        ]

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"token {self._token}",
        }

        try:
            response = self._client.post(
                MERGE_TREE_API_URL,
                headers=headers,
                json=commit_data,
            )
        except httpx.RequestError as e:
            raise create_api_error(0, f"Network error: {e}", nid) from e

        if not response.is_success:
            raise create_api_error(
                response.status_code,
                "Failed to merge asset trees",
                nid,
            )

        data = response.json()
        merged = data.get("mergedAssetTree", data)

        # Map known fields and put the rest in extra
        known_fields = {
            "assetCid",
            "assetSha256",
            "creatorName",
            "creatorWallet",
            "createdAt",
            "locationCreated",
            "caption",
            "headline",
            "license",
            "mimeType",
        }

        extra = {k: v for k, v in merged.items() if k not in known_fields}

        return AssetTree(
            asset_cid=merged.get("assetCid"),
            asset_sha256=merged.get("assetSha256"),
            creator_name=merged.get("creatorName"),
            creator_wallet=merged.get("creatorWallet"),
            created_at=merged.get("createdAt"),
            location_created=merged.get("locationCreated"),
            caption=merged.get("caption"),
            headline=merged.get("headline"),
            license=merged.get("license"),
            mime_type=merged.get("mimeType"),
            extra=extra,
        )
