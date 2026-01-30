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
  type AssetSearchOptions,
  type AssetSearchResult,
  type SimilarMatch,
  type NftSearchResult,
  type NftRecord,
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
const ASSET_SEARCH_API_URL =
  'https://us-central1-numbers-protocol-api.cloudfunctions.net/asset-search'
const NFT_SEARCH_API_URL = 'https://eofveg1f59hrbn.m.pipedream.net'

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
   *
   * @example
   * ```typescript
   * const asset = await capture.get('bafybei...')
   * console.log('Filename:', asset.filename)
   * console.log('Caption:', asset.caption)
   * ```
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
   *
   * @example
   * ```typescript
   * const history = await capture.getHistory('bafybei...')
   * for (const commit of history) {
   *   console.log('Action:', commit.action)
   *   console.log('Author:', commit.author)
   *   console.log('Date:', new Date(commit.timestamp * 1000))
   * }
   * ```
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
   * Searches for similar assets using image similarity.
   *
   * @param options - Search options (must provide fileUrl, file, or nid)
   * @returns Search results with precise match and similar assets
   *
   * @example
   * ```typescript
   * // Search by file URL
   * const result = await capture.searchAsset({ fileUrl: 'https://example.com/image.jpg' })
   *
   * // Search by NID
   * const result = await capture.searchAsset({ nid: 'bafybei...' })
   *
   * // Search by file with options
   * const result = await capture.searchAsset({
   *   file: './photo.jpg',
   *   threshold: 0.5,
   *   sampleCount: 10
   * })
   * ```
   */
  async searchAsset(options: AssetSearchOptions): Promise<AssetSearchResult> {
    // Validate that at least one input source is provided
    if (!options.fileUrl && !options.file && !options.nid) {
      throw new ValidationError(
        'Must provide fileUrl, file, or nid for asset search'
      )
    }

    // Validate threshold
    if (
      options.threshold !== undefined &&
      (options.threshold < 0 || options.threshold > 1)
    ) {
      throw new ValidationError('threshold must be between 0 and 1')
    }

    // Validate sampleCount
    if (
      options.sampleCount !== undefined &&
      (options.sampleCount < 1 || !Number.isInteger(options.sampleCount))
    ) {
      throw new ValidationError('sampleCount must be a positive integer')
    }

    const formData = new FormData()

    // Add input source
    if (options.fileUrl) {
      formData.append('url', options.fileUrl)
    } else if (options.nid) {
      formData.append('nid', options.nid)
    } else if (options.file) {
      const { data, filename, mimeType } = await normalizeFile(options.file)
      const buffer = new ArrayBuffer(data.byteLength)
      new Uint8Array(buffer).set(data)
      const blob = new Blob([buffer], { type: mimeType })
      formData.append('file', blob, filename)
    }

    // Add optional parameters
    if (options.threshold !== undefined) {
      formData.append('threshold', String(options.threshold))
    }
    if (options.sampleCount !== undefined) {
      formData.append('sample_count', String(options.sampleCount))
    }

    // Verify Engine API requires token in Authorization header, not form data
    const response = await fetch(ASSET_SEARCH_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `token ${this.token}`,
      },
      body: formData,
    })

    if (!response.ok) {
      let message = `Asset search failed with status ${response.status}`
      try {
        const errorData = await response.json()
        message = errorData.message || errorData.error || message
      } catch {
        // Use default message
      }
      throw createApiError(response.status, message)
    }

    const data = await response.json()

    // Map response to our type
    const similarMatches: SimilarMatch[] = (data.similar_matches || []).map(
      (m: { nid: string; distance: number }) => ({
        nid: m.nid,
        distance: m.distance,
      })
    )

    return {
      preciseMatch: data.precise_match || '',
      inputFileMimeType: data.input_file_mime_type || '',
      similarMatches,
      orderId: data.order_id || '',
    }
  }

  /**
   * Searches for NFTs across multiple blockchains that match an asset.
   *
   * @param nid - Numbers ID of the asset to search for
   * @returns NFT records found across different chains
   *
   * @example
   * ```typescript
   * const result = await capture.searchNft('bafybei...')
   * for (const nft of result.records) {
   *   console.log(`Found on ${nft.network}: ${nft.contract}#${nft.tokenId}`)
   * }
   * ```
   */
  async searchNft(nid: string): Promise<NftSearchResult> {
    if (!nid) {
      throw new ValidationError('nid is required for NFT search')
    }

    const response = await fetch(NFT_SEARCH_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `token ${this.token}`,
      },
      body: JSON.stringify({ nid }),
    })

    if (!response.ok) {
      let message = `NFT search failed with status ${response.status}`
      try {
        const errorData = await response.json()
        message = errorData.message || errorData.error || message
      } catch {
        // Use default message
      }
      throw createApiError(response.status, message, nid)
    }

    const data = await response.json()

    // Map response to our type
    const records: NftRecord[] = (data.records || []).map(
      (r: {
        token_id: string
        contract: string
        network: string
        owner?: string
      }) => ({
        tokenId: r.token_id,
        contract: r.contract,
        network: r.network,
        owner: r.owner,
      })
    )

    return {
      records,
      orderId: data.order_id || '',
    }
  }
}
