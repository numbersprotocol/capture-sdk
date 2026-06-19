/**
 * Unit tests for Capture SDK cryptographic utilities.
 */

import { describe, it, expect } from 'vitest'
import { sha256, createIntegrityProof, verifySignature } from './crypto.js'

describe('sha256', () => {
  it('should compute correct SHA-256 hash', async () => {
    // Known SHA-256 of empty string
    const emptyHash = await sha256(new Uint8Array(0))
    expect(emptyHash).toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
    )
  })

  it('should compute correct SHA-256 hash for known input', async () => {
    // SHA-256 of "hello"
    const data = new TextEncoder().encode('hello')
    const hash = await sha256(data)
    expect(hash).toBe(
      '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824'
    )
  })

  it('should return a 64-character hex string', async () => {
    const data = new TextEncoder().encode('test data')
    const hash = await sha256(data)
    expect(hash).toHaveLength(64)
    expect(hash).toMatch(/^[0-9a-f]{64}$/)
  })

  it('should produce different hashes for different inputs', async () => {
    const hash1 = await sha256(new TextEncoder().encode('input1'))
    const hash2 = await sha256(new TextEncoder().encode('input2'))
    expect(hash1).not.toBe(hash2)
  })
})

describe('createIntegrityProof', () => {
  it('should create integrity proof with correct fields', () => {
    const proofHash = 'abc123'
    const mimeType = 'image/jpeg'
    const before = Date.now()
    const proof = createIntegrityProof(proofHash, mimeType)
    const after = Date.now()

    expect(proof.proof_hash).toBe(proofHash)
    expect(proof.asset_mime_type).toBe(mimeType)
    expect(proof.created_at).toBeGreaterThanOrEqual(before)
    expect(proof.created_at).toBeLessThanOrEqual(after)
  })

  it('should use millisecond timestamp', () => {
    const proof = createIntegrityProof('hash', 'image/png')
    // Millisecond timestamps are > 1e12 (current year timestamps)
    expect(proof.created_at).toBeGreaterThan(1e12)
  })
})

describe('verifySignature', () => {
  it('should return false for invalid signature', () => {
    const result = verifySignature('message', 'invalid-signature', '0x1234')
    expect(result).toBe(false)
  })

  it('should return false for address mismatch', async () => {
    // Use a different address than the actual signer
    const wrongAddress = '0x0000000000000000000000000000000000000001'
    const result = verifySignature('test message', '0x' + '0'.repeat(130), wrongAddress)
    expect(result).toBe(false)
  })
})
