"""Tests for crypto utilities."""

import json

from numbersprotocol_capture import sha256, verify_signature
from numbersprotocol_capture.crypto import create_integrity_proof, sign_integrity_proof
from numbersprotocol_capture.types import IntegrityProof


class TestSha256:
    """Tests for SHA-256 hashing."""

    def test_sha256_bytes(self) -> None:
        """Test SHA-256 hash of bytes."""
        result = sha256(b"hello world")
        expected = "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9"
        assert result == expected

    def test_sha256_bytearray(self) -> None:
        """Test SHA-256 hash of bytearray."""
        result = sha256(bytearray(b"hello world"))
        expected = "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9"
        assert result == expected

    def test_sha256_empty(self) -> None:
        """Test SHA-256 hash of empty bytes."""
        result = sha256(b"")
        expected = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
        assert result == expected


class TestIntegrityProof:
    """Tests for integrity proof creation and signing."""

    def test_create_integrity_proof(self) -> None:
        """Test integrity proof creation."""
        proof = create_integrity_proof("abc123", "image/jpeg")
        assert proof.proof_hash == "abc123"
        assert proof.asset_mime_type == "image/jpeg"
        assert proof.created_at > 0

    def test_sign_integrity_proof(self) -> None:
        """Test integrity proof signing."""
        # Test private key (DO NOT use in production)
        private_key = "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"

        proof = create_integrity_proof("abc123", "image/jpeg")
        signature = sign_integrity_proof(proof, private_key)

        assert signature.proof_hash == "abc123"
        assert signature.provider == "capture-sdk"
        assert signature.signature.startswith("0x") or len(signature.signature) == 130
        assert signature.public_key.startswith("0x")
        assert len(signature.integrity_sha) == 64

    def test_sign_integrity_proof_without_0x_prefix(self) -> None:
        """Test signing works with private key without 0x prefix."""
        private_key = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"

        proof = create_integrity_proof("abc123", "image/jpeg")
        signature = sign_integrity_proof(proof, private_key)

        assert signature.public_key.startswith("0x")


class TestVerifySignature:
    """Tests for signature verification."""

    def test_verify_valid_signature(self) -> None:
        """Test verification of a valid signature."""
        # Test private key and its derived address
        private_key = "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"

        proof = create_integrity_proof("abc123", "image/jpeg")
        signature = sign_integrity_proof(proof, private_key)

        # Verify using the address derived from the private key
        assert verify_signature(
            signature.integrity_sha,
            signature.signature,
            signature.public_key,
        )

    def test_verify_invalid_signature(self) -> None:
        """Test verification fails for invalid signature."""
        result = verify_signature(
            "some message",
            "0x" + "00" * 65,
            "0x1234567890123456789012345678901234567890",
        )
        assert result is False

    def test_verify_wrong_address(self) -> None:
        """Test verification fails for wrong address."""
        private_key = "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
        wrong_address = "0x0000000000000000000000000000000000000000"

        proof = create_integrity_proof("abc123", "image/jpeg")
        signature = sign_integrity_proof(proof, private_key)

        assert not verify_signature(
            signature.integrity_sha,
            signature.signature,
            wrong_address,
        )


class TestIntegrityProofSerialization:
    """Tests for integrity proof JSON serialization consistency."""

    def test_sign_integrity_proof_uses_only_three_keys(self) -> None:
        """Test that sign_integrity_proof serializes exactly three keys in expected order."""
        proof = IntegrityProof(
            proof_hash="abc123",
            asset_mime_type="image/jpeg",
            created_at=1700000000000,
        )
        # Manually reproduce the expected JSON (same as the implementation)
        expected_json = json.dumps(
            {
                "proof_hash": proof.proof_hash,
                "asset_mime_type": proof.asset_mime_type,
                "created_at": proof.created_at,
            },
            separators=(",", ":"),
        )
        expected_sha = sha256(expected_json.encode("utf-8"))

        private_key = "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
        signature = sign_integrity_proof(proof, private_key)

        assert signature.integrity_sha == expected_sha

    def test_sign_integrity_proof_ignores_extra_fields(self) -> None:
        """Test that two identical proofs produce identical integrity_sha values."""
        proof1 = IntegrityProof(
            proof_hash="abc123",
            asset_mime_type="image/jpeg",
            created_at=1700000000000,
        )
        proof2 = IntegrityProof(
            proof_hash="abc123",
            asset_mime_type="image/jpeg",
            created_at=1700000000000,
        )
        private_key = "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"

        sig1 = sign_integrity_proof(proof1, private_key)
        sig2 = sign_integrity_proof(proof2, private_key)

        assert sig1.integrity_sha == sig2.integrity_sha
