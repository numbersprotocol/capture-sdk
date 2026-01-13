import { Wallet, verifyMessage } from 'ethers'
import type { IntegrityProof, AssetSignature } from './types.js'

/**
 * Computes SHA-256 hash of data using Web Crypto API.
 * Works in both Node.js 18+ and modern browsers.
 */
export async function sha256(data: Uint8Array): Promise<string> {
  // Create a new ArrayBuffer copy to avoid SharedArrayBuffer issues
  const buffer = new ArrayBuffer(data.byteLength)
  new Uint8Array(buffer).set(data)
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
  const hashArray = new Uint8Array(hashBuffer)
  return Array.from(hashArray)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Creates an integrity proof for asset registration.
 */
export function createIntegrityProof(
  proofHash: string,
  mimeType: string
): IntegrityProof {
  return {
    proof_hash: proofHash,
    asset_mime_type: mimeType,
    created_at: Date.now(),
  }
}

/**
 * Signs an integrity proof using EIP-191 standard.
 * Returns the signature data required for asset registration.
 */
export async function signIntegrityProof(
  proof: IntegrityProof,
  privateKey: string
): Promise<AssetSignature> {
  const wallet = new Wallet(privateKey)

  // Compute integrity hash of the signed metadata JSON
  const proofJson = JSON.stringify(proof)
  const proofBytes = new TextEncoder().encode(proofJson)
  const integritySha = await sha256(proofBytes)

  // Sign the integrity hash using EIP-191
  const signature = await wallet.signMessage(integritySha)

  return {
    proofHash: proof.proof_hash,
    provider: 'capture-sdk',
    signature,
    publicKey: wallet.address,
    integritySha,
  }
}

/**
 * Verifies an EIP-191 signature against a message and expected signer.
 */
export function verifySignature(
  message: string,
  signature: string,
  expectedAddress: string
): boolean {
  try {
    const recovered = verifyMessage(message, signature)
    return recovered.toLowerCase() === expectedAddress.toLowerCase()
  } catch {
    return false
  }
}
