/**
 * Flexible file input type - SDK handles all conversions internally.
 */
export type FileInput =
  | string // File path (Node.js only)
  | File // Browser File object
  | Blob // Browser Blob
  | Buffer // Node.js Buffer
  | Uint8Array // Universal binary data

/**
 * Configuration options for the Capture client.
 */
export interface CaptureOptions {
  /** Authentication token for API access */
  token: string
  /** Use testnet environment (default: false) */
  testnet?: boolean
  /** Custom base URL (overrides testnet setting) */
  baseUrl?: string
}

/**
 * Options for signing asset registration.
 */
export interface SignOptions {
  /** Ethereum private key for EIP-191 signing */
  privateKey: string
}

/**
 * Options for registering a new asset.
 */
export interface RegisterOptions {
  /** Filename (required for Buffer/Uint8Array/Blob inputs) */
  filename?: string
  /** Brief description of the asset */
  caption?: string
  /** Asset title (max 25 characters) */
  headline?: string
  /** Pin to public IPFS gateway (default: true) */
  publicAccess?: boolean
  /** Optional signing configuration */
  sign?: SignOptions
}

/**
 * Options for updating an existing asset.
 */
export interface UpdateOptions {
  /** Updated description */
  caption?: string
  /** Updated title (max 25 characters) */
  headline?: string
  /** Description of the changes */
  commitMessage?: string
  /** Custom metadata fields */
  customMetadata?: Record<string, unknown>
}

/**
 * Registered asset information.
 */
export interface Asset {
  /** Numbers ID (NID) - unique identifier */
  nid: string
  /** Original filename */
  filename: string
  /** MIME type of the asset */
  mimeType: string
  /** Asset description */
  caption?: string
  /** Asset title */
  headline?: string
}

/**
 * A single commit in the asset's history.
 */
export interface Commit {
  /** CID of the asset tree at this commit */
  assetTreeCid: string
  /** Blockchain transaction hash */
  txHash: string
  /** Original creator's address */
  author: string
  /** Address that made this commit */
  committer: string
  /** Unix timestamp of the commit */
  timestamp: number
  /** Description of the action */
  action: string
}

/**
 * Merged asset tree containing full provenance data.
 */
export interface AssetTree {
  /** Asset content identifiers */
  assetCid?: string
  assetSha256?: string
  /** Creator information */
  creatorName?: string
  creatorWallet?: string
  /** Creation metadata */
  createdAt?: number
  locationCreated?: string
  /** Asset description */
  caption?: string
  headline?: string
  /** License information */
  license?: string
  /** MIME type */
  mimeType?: string
  /** Additional fields from commits */
  [key: string]: unknown
}

/**
 * Integrity proof for asset registration.
 * @internal
 */
export interface IntegrityProof {
  proof_hash: string
  asset_mime_type: string
  created_at: number
}

/**
 * Signature data for asset registration.
 * @internal
 */
export interface AssetSignature {
  proofHash: string
  provider: string
  signature: string
  publicKey: string
  integritySha: string
}

/**
 * API response for asset registration/retrieval.
 * @internal
 */
export interface AssetApiResponse {
  id: string
  asset_file_name: string
  asset_file_mime_type: string
  caption?: string
  headline?: string
}

/**
 * API response for commit history.
 * @internal
 */
export interface CommitApiResponse {
  assetTreeCid: string
  txHash: string
  author: string
  committer: string
  timestampCreated: number
  action: string
}

/**
 * API response for asset history endpoint.
 * @internal
 */
export interface HistoryApiResponse {
  nid: string
  commits: CommitApiResponse[]
}

// ============================================
// Verify Engine Types
// ============================================

/**
 * Input for asset verification - either a file or a URL.
 */
export type VerifyInput =
  | FileInput
  | { url: string }

/**
 * Options for the verify method.
 */
export interface VerifyOptions {
  /**
   * Distance threshold for filtering similar results.
   * Lower values = stricter matching.
   * @default 0.12
   */
  threshold?: number
  /**
   * List of NIDs to exclude from results.
   */
  excludedAssets?: string[]
  /**
   * List of contract addresses to exclude from results.
   */
  excludedContracts?: string[]
}

/**
 * NFT information from cross-chain search.
 */
export interface NFTMatch {
  /** Contract address */
  contractAddress?: string
  /** Token ID */
  tokenId?: string
  /** Blockchain network */
  chain?: string
  /** NFT name */
  name?: string
  /** NFT description */
  description?: string
  /** Image URL */
  imageUrl?: string
  /** Marketplace URL */
  marketplaceUrl?: string
  /** Owner address */
  owner?: string
  /** Additional metadata */
  [key: string]: unknown
}

/**
 * Similar asset found by the Verify Engine.
 */
export interface SimilarAsset {
  /** Numbers ID of the similar asset */
  nid?: string
  /** Distance score (lower = more similar) */
  distance?: number
  /** Asset CID */
  assetCid?: string
  /** Creator information */
  creator?: string
  /** Creation timestamp */
  createdAt?: number
  /** Additional metadata */
  [key: string]: unknown
}

/**
 * Result from the Verify Engine theft detection.
 */
export interface VerifyResult {
  /** Numbers ID assigned to the searched file */
  searchNid: string
  /** MIME type of the searched file */
  inputFileMimeType: string
  /** Order ID for this verification request */
  orderId: string
  /** Similar assets found */
  similarAssets: SimilarAsset[]
  /** Cross-chain NFT matches */
  nftMatches: NFTMatch[]
  /** Raw results from the API */
  raw: unknown
}

/**
 * API response from Verify Engine.
 * @internal
 */
export interface VerifyApiResponse {
  results: unknown
  searchNid: string
  inputFileMimetype: string
  orderID: string
}
