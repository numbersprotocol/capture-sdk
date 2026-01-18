"""
Cryptographic utilities for the Capture SDK.
"""

import hashlib
import json
import time

from eth_account import Account
from eth_account.messages import encode_defunct

from .types import AssetSignature, IntegrityProof


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


def sign_integrity_proof(proof: IntegrityProof, private_key: str) -> AssetSignature:
    """
    Signs an integrity proof using EIP-191 standard.

    Args:
        proof: IntegrityProof object to sign.
        private_key: Ethereum private key (hex string with or without 0x prefix).

    Returns:
        AssetSignature containing the signature data.
    """
    # Ensure private key has 0x prefix
    if not private_key.startswith("0x"):
        private_key = f"0x{private_key}"

    account = Account.from_key(private_key)

    # Compute integrity hash of the signed metadata JSON
    proof_dict = {
        "proof_hash": proof.proof_hash,
        "asset_mime_type": proof.asset_mime_type,
        "created_at": proof.created_at,
    }
    proof_json = json.dumps(proof_dict, separators=(",", ":"))
    integrity_sha = sha256(proof_json.encode("utf-8"))

    # Sign the integrity hash using EIP-191
    message = encode_defunct(text=integrity_sha)
    signed = account.sign_message(message)

    return AssetSignature(
        proof_hash=proof.proof_hash,
        provider="capture-sdk",
        signature=signed.signature.hex(),
        public_key=account.address,
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
        recovered = Account.recover_message(msg, signature=signature)
        return recovered.lower() == expected_address.lower()
    except Exception:
        return False
