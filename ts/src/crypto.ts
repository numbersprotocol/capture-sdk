import { Wallet, verifyMessage } from 'ethers'
import type { IntegrityProof, AssetSignature, SignOptions } from './types.js'

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
 * Accepts either a raw private key string or a custom signer callback (via SignOptions)
 * to minimise the lifetime of key material in memory.
 *
 * @param proof - Integrity proof to sign.
 * @param privateKeyOrOptions - Ethereum private key string **or** a SignOptions object
 *   with a `signer` callback and `address`.
 */
export async function signIntegrityProof(
  proof: IntegrityProof,
  privateKeyOrOptions: string | SignOptions
): Promise<AssetSignature> {
  // Compute integrity hash of the signed metadata JSON
  const proofJson = JSON.stringify(proof)
  const proofBytes = new TextEncoder().encode(proofJson)
  const integritySha = await sha256(proofBytes)

  let signature: string
  let address: string

  if (typeof privateKeyOrOptions === 'string') {
    // Legacy path: private key passed directly
    const wallet = new Wallet(privateKeyOrOptions)
    signature = await wallet.signMessage(integritySha)
    address = wallet.address
  } else if (privateKeyOrOptions.signer && privateKeyOrOptions.address) {
    // Custom signer path: private key never enters this process
    signature = await privateKeyOrOptions.signer(integritySha)
    address = privateKeyOrOptions.address
  } else if (privateKeyOrOptions.privateKey) {
    // SignOptions with privateKey field
    const wallet = new Wallet(privateKeyOrOptions.privateKey)
    signature = await wallet.signMessage(integritySha)
    address = wallet.address
  } else {
    throw new Error(
      'signIntegrityProof: provide either privateKey or both signer and address'
    )
  }

  return {
    proofHash: proof.proof_hash,
    provider: 'capture-sdk',
    signature,
    publicKey: address,
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
