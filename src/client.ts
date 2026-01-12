import {
  type FileInput,
  type CaptureOptions,
  type RegisterOptions,
  type UpdateOptions,
  type Asset,
  type Commit,
  type AssetTree,
  type AssetApiResponse,
  type HistoryApiResponse,
  type VerifyInput,
  type VerifyOptions,
  type VerifyResult,
  type VerifyApiResponse,
  type SimilarAsset,
  type NFTMatch,
} from './types.js'
import {
  ValidationError,
  createApiError,
  CaptureError,
} from './errors.js'
import { sha256, createIntegrityProof, signIntegrityProof } from './crypto.js'

const DEFAULT_BASE_URL = 'https://api.numbersprotocol.io/api/v3'
const HISTORY_API_URL =
  'https://e23hi68y55.execute-api.us-east-1.amazonaws.com/default/get-commits-storage-backend-jade-near'
const MERGE_TREE_API_URL =
  'https://us-central1-numbers-protocol-api.cloudfunctions.net/get-full-asset-tree'
const VERIFY_ENGINE_API_URL = 'https://eofveg1f59hrbn.m.pipedream.net'

/** Common MIME types by extension */
const MIME_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  mp4: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  pdf: 'application/pdf',
  json: 'application/json',
  txt: 'text/plain',
}

/**
 * Detects MIME type from filename extension.
 */
function getMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() ?? ''
  return MIME_TYPES[ext] ?? 'application/octet-stream'
}

/**
 * Checks if running in Node.js environment.
 */
function isNodeEnvironment(): boolean {
  return (
    typeof process !== 'undefined' &&
    process.versions != null &&
    process.versions.node != null
  )
}

/**
 * Normalizes various file input types to a common format.
 */
async function normalizeFile(
  input: FileInput,
  options?: RegisterOptions
): Promise<{ data: Uint8Array; filename: string; mimeType: string }> {
  // 1. String path (Node.js only)
  if (typeof input === 'string') {
    if (!isNodeEnvironment()) {
      throw new ValidationError(
        'File path input is only supported in Node.js environment'
      )
    }
    const fs = await import('fs/promises')
    const path = await import('path')
    const data = await fs.readFile(input)
    const filename = path.basename(input)
    const mimeType = getMimeType(filename)
    return { data: new Uint8Array(data), filename, mimeType }
  }

  // 2. File object (Browser)
  if (typeof File !== 'undefined' && input instanceof File) {
    const data = new Uint8Array(await input.arrayBuffer())
    return { data, filename: input.name, mimeType: input.type || getMimeType(input.name) }
  }

  // 3. Blob (Browser)
  if (typeof Blob !== 'undefined' && input instanceof Blob) {
    if (!options?.filename) {
      throw new ValidationError('filename is required for Blob input')
    }
    const data = new Uint8Array(await input.arrayBuffer())
    const mimeType = input.type || getMimeType(options.filename)
    return { data, filename: options.filename, mimeType }
  }

  // 4. Buffer or Uint8Array
  if (!options?.filename) {
    throw new ValidationError('filename is required for binary input')
  }
  // Handle both Buffer and Uint8Array
  let data: Uint8Array
  if (input instanceof Uint8Array) {
    data = input
  } else if (typeof Buffer !== 'undefined' && Buffer.isBuffer(input)) {
    data = new Uint8Array(input.buffer, input.byteOffset, input.byteLength)
  } else {
    // This shouldn't happen with proper type checking, but handle it gracefully
    throw new ValidationError('Unsupported file input type')
  }
  return { data, filename: options.filename, mimeType: getMimeType(options.filename) }
}

/**
 * Converts Asset API response to Asset type.
 */
function toAsset(response: AssetApiResponse): Asset {
  return {
    nid: response.id,
    filename: response.asset_file_name,
    mimeType: response.asset_file_mime_type,
    caption: response.caption,
    headline: response.headline,
  }
}

/**
 * Main Capture SDK client.
 */
export class Capture {
  private readonly token: string
  private readonly baseUrl: string
  private readonly testnet: boolean

  constructor(options: CaptureOptions) {
    if (!options.token) {
      throw new ValidationError('token is required')
    }
    this.token = options.token
    this.testnet = options.testnet ?? false
    this.baseUrl = options.baseUrl ?? DEFAULT_BASE_URL
  }

  /**
   * Makes an authenticated API request.
   */
  private async request<T>(
    method: string,
    url: string,
    body?: FormData | Record<string, unknown>,
    nid?: string
  ): Promise<T> {
    const headers: Record<string, string> = {
      Authorization: `token ${this.token}`,
    }

    let requestBody: FormData | string | undefined
    if (body instanceof FormData) {
      requestBody = body
    } else if (body) {
      headers['Content-Type'] = 'application/json'
      requestBody = JSON.stringify(body)
    }

    const response = await fetch(url, {
      method,
      headers,
      body: requestBody,
    })

    if (!response.ok) {
      let message = `API request failed with status ${response.status}`
      try {
        const errorData = await response.json()
        message = errorData.detail || errorData.message || message
      } catch {
        // Use default message
      }
      throw createApiError(response.status, message, nid)
    }

    return response.json() as Promise<T>
  }

  /**
   * Registers a new asset.
   *
   * @param file - File to register (path, File, Blob, Buffer, or Uint8Array)
   * @param options - Registration options
   * @returns Registered asset information
   *
   * @example
   * ```typescript
   * // Node.js: File path
   * const asset = await capture.register('./photo.jpg')
   *
   * // Browser: File input
   * const asset = await capture.register(fileInput.files[0])
   *
   * // With options
   * const asset = await capture.register('./photo.jpg', {
   *   caption: 'My photo',
   *   headline: 'Demo'
   * })
   * ```
   */
  async register(file: FileInput, options?: RegisterOptions): Promise<Asset> {
    // Validate headline length
    if (options?.headline && options.headline.length > 25) {
      throw new ValidationError('headline must be 25 characters or less')
    }

    // Normalize file input
    const { data, filename, mimeType } = await normalizeFile(file, options)

    if (data.length === 0) {
      throw new ValidationError('file cannot be empty')
    }

    // Create form data
    const formData = new FormData()

    // Create blob for the file - create new ArrayBuffer to avoid SharedArrayBuffer issues
    const buffer = new ArrayBuffer(data.byteLength)
    new Uint8Array(buffer).set(data)
    const blob = new Blob([buffer], { type: mimeType })
    formData.append('asset_file', blob, filename)

    // Add optional fields
    if (options?.caption) {
      formData.append('caption', options.caption)
    }
    if (options?.headline) {
      formData.append('headline', options.headline)
    }

    const publicAccess = options?.publicAccess ?? true
    formData.append('public_access', String(publicAccess))

    // Handle signing if private key provided
    if (options?.sign?.privateKey) {
      const proofHash = await sha256(data)
      const proof = createIntegrityProof(proofHash, mimeType)
      const signature = await signIntegrityProof(proof, options.sign.privateKey)

      formData.append('signed_metadata', JSON.stringify(proof))
      formData.append('signature', JSON.stringify([signature]))
    }

    const response = await this.request<AssetApiResponse>(
      'POST',
      `${this.baseUrl}/assets/`,
      formData
    )

    return toAsset(response)
  }

  /**
   * Updates an existing asset's metadata.
   *
   * @param nid - Numbers ID of the asset to update
   * @param options - Update options
   * @returns Updated asset information
   *
   * @example
   * ```typescript
   * const updated = await capture.update(asset.nid, {
   *   caption: 'Updated caption',
   *   commitMessage: 'Fixed typo in caption'
   * })
   * ```
   */
  async update(nid: string, options: UpdateOptions): Promise<Asset> {
    if (!nid) {
      throw new ValidationError('nid is required')
    }

    if (options.headline && options.headline.length > 25) {
      throw new ValidationError('headline must be 25 characters or less')
    }

    const formData = new FormData()

    if (options.caption !== undefined) {
      formData.append('caption', options.caption)
    }
    if (options.headline !== undefined) {
      formData.append('headline', options.headline)
    }
    if (options.commitMessage) {
      formData.append('commit_message', options.commitMessage)
    }
    if (options.customMetadata) {
      formData.append('nit_commit_custom', JSON.stringify(options.customMetadata))
    }

    const response = await this.request<AssetApiResponse>(
      'PATCH',
      `${this.baseUrl}/assets/${nid}/`,
      formData,
      nid
    )

    return toAsset(response)
  }

  /**
   * Retrieves a single asset by NID.
   *
   * @param nid - Numbers ID of the asset
   * @returns Asset information
   */
  async get(nid: string): Promise<Asset> {
    if (!nid) {
      throw new ValidationError('nid is required')
    }

    const response = await this.request<AssetApiResponse>(
      'GET',
      `${this.baseUrl}/assets/${nid}/`,
      undefined,
      nid
    )

    return toAsset(response)
  }

  /**
   * Retrieves the commit history of an asset.
   *
   * @param nid - Numbers ID of the asset
   * @returns Array of commits
   */
  async getHistory(nid: string): Promise<Commit[]> {
    if (!nid) {
      throw new ValidationError('nid is required')
    }

    const url = new URL(HISTORY_API_URL)
    url.searchParams.set('nid', nid)
    if (this.testnet) {
      url.searchParams.set('testnet', 'true')
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `token ${this.token}`,
      },
    })

    if (!response.ok) {
      throw createApiError(response.status, 'Failed to fetch asset history', nid)
    }

    const data = (await response.json()) as HistoryApiResponse

    return data.commits.map((c) => ({
      assetTreeCid: c.assetTreeCid,
      txHash: c.txHash,
      author: c.author,
      committer: c.committer,
      timestamp: c.timestampCreated,
      action: c.action,
    }))
  }

  /**
   * Retrieves the merged asset tree containing full provenance data.
   * Combines all commits in chronological order.
   *
   * @param nid - Numbers ID of the asset
   * @returns Merged asset tree
   *
   * @example
   * ```typescript
   * const tree = await capture.getAssetTree(asset.nid)
   * console.log('Creator:', tree.creatorName)
   * console.log('Created at:', new Date(tree.createdAt))
   * ```
   */
  async getAssetTree(nid: string): Promise<AssetTree> {
    if (!nid) {
      throw new ValidationError('nid is required')
    }

    // First, get the commit history
    const commits = await this.getHistory(nid)

    if (commits.length === 0) {
      throw new CaptureError('No commits found for asset', 'NO_COMMITS', 404)
    }

    // Prepare the request body for merging
    const commitData = commits.map((c) => ({
      assetTreeCid: c.assetTreeCid,
      timestampCreated: c.timestamp,
    }))

    const response = await fetch(MERGE_TREE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `token ${this.token}`,
      },
      body: JSON.stringify(commitData),
    })

    if (!response.ok) {
      throw createApiError(response.status, 'Failed to merge asset trees', nid)
    }

    const data = await response.json()

    // The API returns { mergedAssetTree: {...}, assetTrees: [...] }
    // We return the merged tree
    return (data.mergedAssetTree || data) as AssetTree
  }

  /**
   * Verifies an asset using the Numbers Verify Engine.
   * Detects similar assets and cross-chain NFT matches for theft detection.
   *
   * @param input - File to verify (path, File, Blob, Buffer, Uint8Array) or URL object
   * @param options - Verification options
   * @returns Verification results including similar assets and NFT matches
   *
   * @example
   * ```typescript
   * // Verify a local file
   * const result = await capture.verify('./photo.jpg')
   *
   * // Verify by URL
   * const result = await capture.verify({ url: 'https://example.com/image.jpg' })
   *
   * // With options
   * const result = await capture.verify('./photo.jpg', {
   *   threshold: 0.1,
   *   excludedAssets: ['bafybei...'],
   *   excludedContracts: ['0x...']
   * })
   *
   * // Check results
   * if (result.similarAssets.length > 0) {
   *   console.log('Similar assets found:', result.similarAssets)
   * }
   * if (result.nftMatches.length > 0) {
   *   console.log('NFT matches found:', result.nftMatches)
   * }
   * ```
   */
  async verify(input: VerifyInput, options?: VerifyOptions): Promise<VerifyResult> {
    const headers: Record<string, string> = {
      Authorization: `token ${this.token}`,
    }

    let response: Response

    // Check if input is a URL object
    if (this.isUrlInput(input)) {
      // URL-based verification
      headers['Content-Type'] = 'application/json'

      const body: Record<string, unknown> = {
        fileURL: input.url,
      }

      if (options?.threshold !== undefined) {
        body.threshold = options.threshold
      }
      if (options?.excludedAssets?.length) {
        body.excludedAssets = options.excludedAssets
      }
      if (options?.excludedContracts?.length) {
        body.excludedContracts = options.excludedContracts
      }

      response = await fetch(VERIFY_ENGINE_API_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      })
    } else {
      // File-based verification
      const { data, filename, mimeType } = await normalizeFile(input, { filename: 'file' })

      if (data.length === 0) {
        throw new ValidationError('file cannot be empty')
      }

      const formData = new FormData()

      // Create blob for the file
      const buffer = new ArrayBuffer(data.byteLength)
      new Uint8Array(buffer).set(data)
      const blob = new Blob([buffer], { type: mimeType })
      formData.append('file', blob, filename)

      if (options?.excludedAssets?.length) {
        formData.append('excludedAssets', JSON.stringify(options.excludedAssets))
      }
      if (options?.excludedContracts?.length) {
        formData.append('excludedContracts', JSON.stringify(options.excludedContracts))
      }
      if (options?.threshold !== undefined) {
        formData.append('threshold', String(options.threshold))
      }

      response = await fetch(VERIFY_ENGINE_API_URL, {
        method: 'POST',
        headers,
        body: formData,
      })
    }

    if (!response.ok) {
      let message = `Verify Engine request failed with status ${response.status}`
      try {
        const errorData = await response.json()
        message = errorData.detail || errorData.message || message
      } catch {
        // Use default message
      }
      throw createApiError(response.status, message)
    }

    const data = (await response.json()) as VerifyApiResponse

    return this.parseVerifyResponse(data)
  }

  /**
   * Checks if the input is a URL object.
   */
  private isUrlInput(input: VerifyInput): input is { url: string } {
    return (
      typeof input === 'object' &&
      input !== null &&
      'url' in input &&
      typeof (input as { url: string }).url === 'string'
    )
  }

  /**
   * Parses the Verify Engine API response into a structured result.
   */
  private parseVerifyResponse(data: VerifyApiResponse): VerifyResult {
    const similarAssets: SimilarAsset[] = []
    const nftMatches: NFTMatch[] = []

    // Parse results - the structure varies based on findings
    if (data.results && typeof data.results === 'object') {
      const results = data.results as Record<string, unknown>

      // Extract similar assets if present
      if (Array.isArray(results.similarAssets)) {
        for (const asset of results.similarAssets) {
          similarAssets.push(asset as SimilarAsset)
        }
      }

      // Extract NFT matches if present
      if (Array.isArray(results.nfts)) {
        for (const nft of results.nfts) {
          nftMatches.push(nft as NFTMatch)
        }
      }

      // Handle case where results is an array directly
      if (Array.isArray(results)) {
        for (const item of results) {
          const entry = item as Record<string, unknown>
          if (entry.contractAddress || entry.tokenId || entry.chain) {
            nftMatches.push(entry as NFTMatch)
          } else {
            similarAssets.push(entry as SimilarAsset)
          }
        }
      }
    }

    return {
      searchNid: data.searchNid,
      inputFileMimeType: data.inputFileMimetype,
      orderId: data.orderID,
      similarAssets,
      nftMatches,
      raw: data.results,
    }
  }
}
