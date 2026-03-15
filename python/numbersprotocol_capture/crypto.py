"""
Cryptographic utilities for the Capture SDK.
"""

import hashlib
import json
import logging
import time
from typing import TYPE_CHECKING

from eth_account import Account
from eth_account.messages import encode_defunct

from .types import AssetSignature, IntegrityProof

if TYPE_CHECKING:
    from .types import SignOptions

logger = logging.getLogger(__name__)


def sha256(data: bytes | bytearray) -> str:
    """
    Computes SHA-256 hash of data.

    Args:
        data: Binary data to hash.

    Returns:
        Hex-encoded SHA-256 hash string.
    """
    if isinstance(data, bytearray):
        data = bytes(data)
    return hashlib.sha256(data).hexdigest()


def create_integrity_proof(proof_hash: str, mime_type: str) -> IntegrityProof:
    """
    Creates an integrity proof for asset registration.

    Args:
        proof_hash: SHA-256 hash of the asset.
        mime_type: MIME type of the asset.

    Returns:
        IntegrityProof object.
    """
    return IntegrityProof(
        proof_hash=proof_hash,
        asset_mime_type=mime_type,
        created_at=int(time.time() * 1000),
    )


def sign_integrity_proof(
    proof: IntegrityProof,
    private_key_or_options: "str | SignOptions",
) -> AssetSignature:
    """
    Signs an integrity proof using EIP-191 standard.

    Accepts either a raw private key string (legacy) or a :class:`SignOptions`
    object.  When a ``SignOptions.signer`` callback is provided the private key
    never enters this process, reducing the window of key exposure in memory.

    Args:
        proof: IntegrityProof object to sign.
        private_key_or_options: Ethereum private key string **or** a
            :class:`~numbersprotocol_capture.types.SignOptions` instance with
            either ``private_key`` or ``signer`` + ``address``.

    Returns:
        AssetSignature containing the signature data.
    """
    from .types import SignOptions as _SignOptions

    # Compute integrity hash of the signed metadata JSON
    proof_dict = {
        "proof_hash": proof.proof_hash,
        "asset_mime_type": proof.asset_mime_type,
        "created_at": proof.created_at,
    }
    proof_json = json.dumps(proof_dict, separators=(",", ":"))
    integrity_sha = sha256(proof_json.encode("utf-8"))

    if isinstance(private_key_or_options, str):
        # Legacy path: raw private key string
        pk = private_key_or_options
        if not pk.startswith("0x"):
            pk = f"0x{pk}"
        account = Account.from_key(pk)
        message = encode_defunct(text=integrity_sha)
        signed = account.sign_message(message)
        sig_hex: str = signed.signature.hex()
        public_key: str = account.address
    elif isinstance(private_key_or_options, _SignOptions):
        opts = private_key_or_options
        if opts.signer is not None and opts.address is not None:
            # Custom signer path – private key stays out of this process
            sig_hex = opts.signer(integrity_sha)
            public_key = opts.address
        elif opts.private_key is not None:
            pk = opts.private_key
            if not pk.startswith("0x"):
                pk = f"0x{pk}"
            account = Account.from_key(pk)
            message = encode_defunct(text=integrity_sha)
            signed = account.sign_message(message)
            sig_hex = signed.signature.hex()
            public_key = account.address
        else:
            raise ValueError(
                "sign_integrity_proof: provide either private_key or both signer and address"
            )
    else:
        raise TypeError(
            f"sign_integrity_proof: unexpected argument type {type(private_key_or_options)}"
        )

    return AssetSignature(
        proof_hash=proof.proof_hash,
        provider="capture-sdk",
        signature=sig_hex,
        public_key=public_key,
        integrity_sha=integrity_sha,
    )


def verify_signature(message: str, signature: str, expected_address: str) -> bool:
    """
    Verifies an EIP-191 signature against a message and expected signer.

    Args:
        message: The original message that was signed.
        signature: The signature to verify (hex string).
        expected_address: Expected signer's Ethereum address.

    Returns:
        True if signature is valid and matches expected address.
    """
    try:
        # Ensure signature has 0x prefix
        if not signature.startswith("0x"):
            signature = f"0x{signature}"

        msg = encode_defunct(text=message)
        recovered: str = Account.recover_message(msg, signature=signature)
        return recovered.lower() == expected_address.lower()
    except Exception as exc:
        logger.debug("verify_signature failed: %s", exc, exc_info=True)
        return False
