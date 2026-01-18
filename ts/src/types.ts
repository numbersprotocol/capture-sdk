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

/**
 * Options for searching similar assets.
 */
export interface AssetSearchOptions {
  /** URL of the file to search */
  fileUrl?: string
  /** File to search (path, File, Blob, Buffer, or Uint8Array) */
  file?: FileInput
  /** Numbers ID of an existing asset to search */
  nid?: string
  /** Similarity threshold (0-1, lower means more similar) */
  threshold?: number
  /** Number of results to return */
  sampleCount?: number
}

/**
 * A similar asset match from the search results.
 */
export interface SimilarMatch {
  /** Numbers ID of the matched asset */
  nid: string
  /** Distance score (lower means more similar) */
  distance: number
}

/**
 * Result of an asset search operation.
 */
export interface AssetSearchResult {
  /** NID of the exact match (empty if none) */
  preciseMatch: string
  /** MIME type of the input file */
  inputFileMimeType: string
  /** List of similar asset matches */
  similarMatches: SimilarMatch[]
  /** Order ID for the search transaction */
  orderId: string
}

/**
 * An NFT record from the NFT search results.
 */
export interface NftRecord {
  /** NFT token ID */
  tokenId: string
  /** Smart contract address */
  contract: string
  /** Blockchain network (e.g., 'ethereum', 'polygon') */
  network: string
  /** Owner's wallet address */
  owner?: string
}

/**
 * Result of an NFT search operation.
 */
export interface NftSearchResult {
  /** List of NFT records found */
  records: NftRecord[]
  /** Order ID for the search transaction */
  orderId: string
}
