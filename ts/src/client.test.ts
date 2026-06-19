/**
 * Unit tests for Capture SDK client.
 *
 * These tests verify request construction and response parsing,
 * including correct authentication header format.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Capture } from './client.js'
import { AuthenticationError, NotFoundError, NetworkError } from './errors.js'

// Test asset NID
const TEST_NID = 'bafybeif3mhxhkhfwuszl2lybtai3hz3q6naqpfisd4q55mcc7opkmiv5ei'

// Mock API URL
const ASSET_SEARCH_API_URL =
  'https://us-central1-numbers-protocol-api.cloudfunctions.net/asset-search'

describe('Capture Client', () => {
  describe('constructor', () => {
    it('should create client with token', () => {
      const capture = new Capture({ token: 'test-token' })
      expect(capture).toBeInstanceOf(Capture)
    })

    it('should throw error without token', () => {
      expect(() => new Capture({ token: '' })).toThrow('token is required')
    })
  })
})

describe('Asset Search Request Construction', () => {
  let originalFetch: typeof global.fetch

  beforeEach(() => {
    // Store original fetch
    originalFetch = global.fetch
  })

  afterEach(() => {
    // Restore original fetch
    global.fetch = originalFetch
    vi.restoreAllMocks()
  })

  it('should send Authorization header with correct format', async () => {
    const testToken = 'my-secret-token'
    const capture = new Capture({ token: testToken })

    // Create mock fetch with proper typing
    const mockFetch = vi.fn<typeof fetch>().mockResolvedValue({
      ok: true,
      json: async () => ({
        precise_match: '',
        input_file_mime_type: '',
        similar_matches: [],
        order_id: 'test-order',
      }),
    } as Response)

    global.fetch = mockFetch

    await capture.searchAsset({ nid: TEST_NID })

    // Verify fetch was called
    expect(mockFetch).toHaveBeenCalledTimes(1)

    // Get the request options
    const [url, options] = mockFetch.mock.calls[0]
    expect(url).toBe(ASSET_SEARCH_API_URL)

    // Verify Authorization header format: "token {token_value}"
    const headers = options?.headers as Record<string, string>
    expect(headers).toBeDefined()
    expect(headers.Authorization).toBe(`token ${testToken}`)
  })

  it('should NOT send token in form data', async () => {
    const testToken = 'my-secret-token'
    const capture = new Capture({ token: testToken })

    const mockFetch = vi.fn<typeof fetch>().mockResolvedValue({
      ok: true,
      json: async () => ({
        precise_match: '',
        input_file_mime_type: '',
        similar_matches: [],
        order_id: 'test-order',
      }),
    } as Response)

    global.fetch = mockFetch

    await capture.searchAsset({ nid: TEST_NID })

    // Get the request body (FormData)
    const [, options] = mockFetch.mock.calls[0]
    const formData = options?.body as FormData

    // Token should NOT be in form data
    expect(formData.has('token')).toBe(false)

    // Verify token is not in any form field by checking known fields
    // Note: FormData.entries() may not be available in all environments,
    // so we check specific fields instead
    expect(formData.get('token')).toBeNull()
  })

  it('should send NID in form data when searching by NID', async () => {
    const capture = new Capture({ token: 'test-token' })

    const mockFetch = vi.fn<typeof fetch>().mockResolvedValue({
      ok: true,
      json: async () => ({
        precise_match: '',
        input_file_mime_type: '',
        similar_matches: [],
        order_id: 'test-order',
      }),
    } as Response)

    global.fetch = mockFetch

    await capture.searchAsset({ nid: TEST_NID })

    // Get the request body (FormData)
    const [, options] = mockFetch.mock.calls[0]
    const formData = options?.body as FormData

    // NID should be in form data
    expect(formData.get('nid')).toBe(TEST_NID)
  })

  it('should send URL in form data when searching by URL', async () => {
    const capture = new Capture({ token: 'test-token' })
    const testUrl = 'https://example.com/image.jpg'

    const mockFetch = vi.fn<typeof fetch>().mockResolvedValue({
      ok: true,
      json: async () => ({
        precise_match: '',
        input_file_mime_type: '',
        similar_matches: [],
        order_id: 'test-order',
      }),
    } as Response)

    global.fetch = mockFetch

    await capture.searchAsset({ fileUrl: testUrl })

    // Get the request body (FormData)
    const [, options] = mockFetch.mock.calls[0]
    const formData = options?.body as FormData

    // URL should be in form data
    expect(formData.get('url')).toBe(testUrl)
  })

  it('should send optional parameters in form data', async () => {
    const capture = new Capture({ token: 'test-token' })

    const mockFetch = vi.fn<typeof fetch>().mockResolvedValue({
      ok: true,
      json: async () => ({
        precise_match: '',
        input_file_mime_type: '',
        similar_matches: [],
        order_id: 'test-order',
      }),
    } as Response)

    global.fetch = mockFetch

    await capture.searchAsset({
      nid: TEST_NID,
      threshold: 0.5,
      sampleCount: 10,
    })

    // Get the request body (FormData)
    const [, options] = mockFetch.mock.calls[0]
    const formData = options?.body as FormData

    // Optional params should be in form data
    expect(formData.get('threshold')).toBe('0.5')
    expect(formData.get('sample_count')).toBe('10')
  })
})

describe('Asset Search Response Parsing', () => {
  let originalFetch: typeof global.fetch

  beforeEach(() => {
    originalFetch = global.fetch
  })

  afterEach(() => {
    global.fetch = originalFetch
    vi.restoreAllMocks()
  })

  it('should parse precise match from response', async () => {
    const mockFetch = vi.fn<typeof fetch>().mockResolvedValue({
      ok: true,
      json: async () => ({
        precise_match: TEST_NID,
        input_file_mime_type: 'image/png',
        similar_matches: [],
        order_id: 'order_123',
      }),
    } as Response)

    global.fetch = mockFetch

    const capture = new Capture({ token: 'test-token' })
    const result = await capture.searchAsset({ nid: TEST_NID })

    expect(result.preciseMatch).toBe(TEST_NID)
  })

  it('should parse similar matches from response', async () => {
    const mockFetch = vi.fn<typeof fetch>().mockResolvedValue({
      ok: true,
      json: async () => ({
        precise_match: '',
        input_file_mime_type: 'image/png',
        similar_matches: [
          { nid: 'bafybei111', distance: 0.05 },
          { nid: 'bafybei222', distance: 0.12 },
        ],
        order_id: 'order_123',
      }),
    } as Response)

    global.fetch = mockFetch

    const capture = new Capture({ token: 'test-token' })
    const result = await capture.searchAsset({ nid: TEST_NID })

    expect(result.similarMatches).toHaveLength(2)
    expect(result.similarMatches[0].nid).toBe('bafybei111')
    expect(result.similarMatches[0].distance).toBe(0.05)
  })

  it('should parse order ID from response', async () => {
    const mockFetch = vi.fn<typeof fetch>().mockResolvedValue({
      ok: true,
      json: async () => ({
        precise_match: '',
        input_file_mime_type: '',
        similar_matches: [],
        order_id: 'order_456',
      }),
    } as Response)

    global.fetch = mockFetch

    const capture = new Capture({ token: 'test-token' })
    const result = await capture.searchAsset({ nid: TEST_NID })

    expect(result.orderId).toBe('order_456')
  })

  it('should parse MIME type from response', async () => {
    const mockFetch = vi.fn<typeof fetch>().mockResolvedValue({
      ok: true,
      json: async () => ({
        precise_match: '',
        input_file_mime_type: 'image/jpeg',
        similar_matches: [],
        order_id: 'order_123',
      }),
    } as Response)

    global.fetch = mockFetch

    const capture = new Capture({ token: 'test-token' })
    const result = await capture.searchAsset({ nid: TEST_NID })

    expect(result.inputFileMimeType).toBe('image/jpeg')
  })

  it('should handle empty similar matches', async () => {
    const mockFetch = vi.fn<typeof fetch>().mockResolvedValue({
      ok: true,
      json: async () => ({
        precise_match: TEST_NID,
        input_file_mime_type: 'image/png',
        similar_matches: [],
        order_id: 'order_123',
      }),
    } as Response)

    global.fetch = mockFetch

    const capture = new Capture({ token: 'test-token' })
    const result = await capture.searchAsset({ nid: TEST_NID })

    expect(result.similarMatches).toHaveLength(0)
  })
})

describe('Asset Search Validation', () => {
  it('should require at least one input source', async () => {
    const capture = new Capture({ token: 'test-token' })

    await expect(capture.searchAsset({})).rejects.toThrow(
      'Must provide fileUrl, file, or nid for asset search'
    )
  })

  it('should validate threshold range', async () => {
    const capture = new Capture({ token: 'test-token' })

    await expect(
      capture.searchAsset({ nid: TEST_NID, threshold: 1.5 })
    ).rejects.toThrow('threshold must be between 0 and 1')

    await expect(
      capture.searchAsset({ nid: TEST_NID, threshold: -0.1 })
    ).rejects.toThrow('threshold must be between 0 and 1')
  })

  it('should validate sampleCount is positive integer', async () => {
    const capture = new Capture({ token: 'test-token' })

    await expect(
      capture.searchAsset({ nid: TEST_NID, sampleCount: 0 })
    ).rejects.toThrow('sampleCount must be a positive integer')

    await expect(
      capture.searchAsset({ nid: TEST_NID, sampleCount: -1 })
    ).rejects.toThrow('sampleCount must be a positive integer')

    await expect(
      capture.searchAsset({ nid: TEST_NID, sampleCount: 1.5 })
    ).rejects.toThrow('sampleCount must be a positive integer')
  })
})

// Shared mock asset API response
const MOCK_ASSET_RESPONSE = {
  id: TEST_NID,
  asset_file_name: 'test.png',
  asset_file_mime_type: 'image/png',
  caption: 'Test caption',
  headline: 'Test headline',
}

describe('register()', () => {
  let originalFetch: typeof global.fetch

  beforeEach(() => {
    originalFetch = global.fetch
  })

  afterEach(() => {
    global.fetch = originalFetch
    vi.restoreAllMocks()
  })

  it('should POST to assets endpoint with multipart form data', async () => {
    const capture = new Capture({ token: 'test-token' })

    const mockFetch = vi.fn<typeof fetch>().mockResolvedValue({
      ok: true,
      json: async () => MOCK_ASSET_RESPONSE,
    } as Response)
    global.fetch = mockFetch

    const fileData = new Uint8Array([1, 2, 3, 4])
    await capture.register(fileData, { filename: 'test.png' })

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [url, options] = mockFetch.mock.calls[0]
    expect(url).toBe('https://api.numbersprotocol.io/api/v3/assets/')
    expect(options?.method).toBe('POST')

    const headers = options?.headers as Record<string, string>
    expect(headers.Authorization).toBe('token test-token')

    const formData = options?.body as FormData
    expect(formData.has('asset_file')).toBe(true)
  })

  it('should include caption and headline when provided', async () => {
    const capture = new Capture({ token: 'test-token' })

    const mockFetch = vi.fn<typeof fetch>().mockResolvedValue({
      ok: true,
      json: async () => MOCK_ASSET_RESPONSE,
    } as Response)
    global.fetch = mockFetch

    const fileData = new Uint8Array([1, 2, 3, 4])
    await capture.register(fileData, {
      filename: 'test.png',
      caption: 'My caption',
      headline: 'My title',
    })

    const [, options] = mockFetch.mock.calls[0]
    const formData = options?.body as FormData
    expect(formData.get('caption')).toBe('My caption')
    expect(formData.get('headline')).toBe('My title')
  })

  it('should set public_access to true by default', async () => {
    const capture = new Capture({ token: 'test-token' })

    const mockFetch = vi.fn<typeof fetch>().mockResolvedValue({
      ok: true,
      json: async () => MOCK_ASSET_RESPONSE,
    } as Response)
    global.fetch = mockFetch

    const fileData = new Uint8Array([1, 2, 3, 4])
    await capture.register(fileData, { filename: 'test.png' })

    const [, options] = mockFetch.mock.calls[0]
    const formData = options?.body as FormData
    expect(formData.get('public_access')).toBe('true')
  })

  it('should parse asset response correctly', async () => {
    const capture = new Capture({ token: 'test-token' })

    const mockFetch = vi.fn<typeof fetch>().mockResolvedValue({
      ok: true,
      json: async () => MOCK_ASSET_RESPONSE,
    } as Response)
    global.fetch = mockFetch

    const fileData = new Uint8Array([1, 2, 3, 4])
    const asset = await capture.register(fileData, { filename: 'test.png' })

    expect(asset.nid).toBe(TEST_NID)
    expect(asset.filename).toBe('test.png')
    expect(asset.mimeType).toBe('image/png')
    expect(asset.caption).toBe('Test caption')
    expect(asset.headline).toBe('Test headline')
  })

  it('should throw ValidationError for headline over 25 characters', async () => {
    const capture = new Capture({ token: 'test-token' })
    const fileData = new Uint8Array([1, 2, 3, 4])

    await expect(
      capture.register(fileData, { filename: 'test.png', headline: 'a'.repeat(26) })
    ).rejects.toThrow('headline must be 25 characters or less')
  })

  it('should throw ValidationError for empty file', async () => {
    const capture = new Capture({ token: 'test-token' })
    const fileData = new Uint8Array([])

    await expect(
      capture.register(fileData, { filename: 'test.png' })
    ).rejects.toThrow('file cannot be empty')
  })

  it('should throw ValidationError for Buffer input without filename', async () => {
    const capture = new Capture({ token: 'test-token' })
    const fileData = new Uint8Array([1, 2, 3])

    await expect(capture.register(fileData)).rejects.toThrow('filename is required')
  })

  it('should throw AuthenticationError on 401 response', async () => {
    const capture = new Capture({ token: 'bad-token' })

    const mockFetch = vi.fn<typeof fetch>().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ detail: 'Unauthorized' }),
    } as Response)
    global.fetch = mockFetch

    const fileData = new Uint8Array([1, 2, 3, 4])
    await expect(capture.register(fileData, { filename: 'test.png' })).rejects.toThrow(
      AuthenticationError
    )
  })

  it('should include Blob input with correct filename', async () => {
    const capture = new Capture({ token: 'test-token' })

    const mockFetch = vi.fn<typeof fetch>().mockResolvedValue({
      ok: true,
      json: async () => MOCK_ASSET_RESPONSE,
    } as Response)
    global.fetch = mockFetch

    const blob = new Blob([new Uint8Array([1, 2, 3, 4])], { type: 'image/png' })
    await capture.register(blob, { filename: 'photo.png' })

    const [, options] = mockFetch.mock.calls[0]
    const formData = options?.body as FormData
    expect(formData.has('asset_file')).toBe(true)
  })
})

describe('update()', () => {
  let originalFetch: typeof global.fetch

  beforeEach(() => {
    originalFetch = global.fetch
  })

  afterEach(() => {
    global.fetch = originalFetch
    vi.restoreAllMocks()
  })

  it('should PATCH to correct asset endpoint', async () => {
    const capture = new Capture({ token: 'test-token' })

    const mockFetch = vi.fn<typeof fetch>().mockResolvedValue({
      ok: true,
      json: async () => MOCK_ASSET_RESPONSE,
    } as Response)
    global.fetch = mockFetch

    await capture.update(TEST_NID, { caption: 'Updated caption' })

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [url, options] = mockFetch.mock.calls[0]
    expect(url).toBe(`https://api.numbersprotocol.io/api/v3/assets/${TEST_NID}/`)
    expect(options?.method).toBe('PATCH')
  })

  it('should send authorization header', async () => {
    const capture = new Capture({ token: 'secret-token' })

    const mockFetch = vi.fn<typeof fetch>().mockResolvedValue({
      ok: true,
      json: async () => MOCK_ASSET_RESPONSE,
    } as Response)
    global.fetch = mockFetch

    await capture.update(TEST_NID, { caption: 'Updated' })

    const [, options] = mockFetch.mock.calls[0]
    const headers = options?.headers as Record<string, string>
    expect(headers.Authorization).toBe('token secret-token')
  })

  it('should include caption in form data', async () => {
    const capture = new Capture({ token: 'test-token' })

    const mockFetch = vi.fn<typeof fetch>().mockResolvedValue({
      ok: true,
      json: async () => MOCK_ASSET_RESPONSE,
    } as Response)
    global.fetch = mockFetch

    await capture.update(TEST_NID, { caption: 'New caption' })

    const [, options] = mockFetch.mock.calls[0]
    const formData = options?.body as FormData
    expect(formData.get('caption')).toBe('New caption')
  })

  it('should include headline and commit_message in form data', async () => {
    const capture = new Capture({ token: 'test-token' })

    const mockFetch = vi.fn<typeof fetch>().mockResolvedValue({
      ok: true,
      json: async () => MOCK_ASSET_RESPONSE,
    } as Response)
    global.fetch = mockFetch

    await capture.update(TEST_NID, {
      headline: 'New title',
      commitMessage: 'Updated headline',
    })

    const [, options] = mockFetch.mock.calls[0]
    const formData = options?.body as FormData
    expect(formData.get('headline')).toBe('New title')
    expect(formData.get('commit_message')).toBe('Updated headline')
  })

  it('should serialize customMetadata as JSON', async () => {
    const capture = new Capture({ token: 'test-token' })

    const mockFetch = vi.fn<typeof fetch>().mockResolvedValue({
      ok: true,
      json: async () => MOCK_ASSET_RESPONSE,
    } as Response)
    global.fetch = mockFetch

    await capture.update(TEST_NID, {
      customMetadata: { source: 'camera', location: 'Taiwan' },
    })

    const [, options] = mockFetch.mock.calls[0]
    const formData = options?.body as FormData
    const metadata = JSON.parse(formData.get('nit_commit_custom') as string)
    expect(metadata.source).toBe('camera')
    expect(metadata.location).toBe('Taiwan')
  })

  it('should parse updated asset response', async () => {
    const capture = new Capture({ token: 'test-token' })

    const updatedResponse = { ...MOCK_ASSET_RESPONSE, caption: 'Updated caption' }
    const mockFetch = vi.fn<typeof fetch>().mockResolvedValue({
      ok: true,
      json: async () => updatedResponse,
    } as Response)
    global.fetch = mockFetch

    const asset = await capture.update(TEST_NID, { caption: 'Updated caption' })

    expect(asset.nid).toBe(TEST_NID)
    expect(asset.caption).toBe('Updated caption')
  })

  it('should throw ValidationError for empty nid', async () => {
    const capture = new Capture({ token: 'test-token' })

    await expect(capture.update('', { caption: 'test' })).rejects.toThrow('nid is required')
  })

  it('should throw ValidationError for headline over 25 characters', async () => {
    const capture = new Capture({ token: 'test-token' })

    await expect(
      capture.update(TEST_NID, { headline: 'a'.repeat(26) })
    ).rejects.toThrow('headline must be 25 characters or less')
  })

  it('should throw NotFoundError on 404 response', async () => {
    const capture = new Capture({ token: 'test-token' })

    const mockFetch = vi.fn<typeof fetch>().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ detail: 'Not found' }),
    } as Response)
    global.fetch = mockFetch

    await expect(capture.update(TEST_NID, { caption: 'test' })).rejects.toThrow(NotFoundError)
  })
})

describe('get()', () => {
  let originalFetch: typeof global.fetch

  beforeEach(() => {
    originalFetch = global.fetch
  })

  afterEach(() => {
    global.fetch = originalFetch
    vi.restoreAllMocks()
  })

  it('should GET from correct asset endpoint', async () => {
    const capture = new Capture({ token: 'test-token' })

    const mockFetch = vi.fn<typeof fetch>().mockResolvedValue({
      ok: true,
      json: async () => MOCK_ASSET_RESPONSE,
    } as Response)
    global.fetch = mockFetch

    await capture.get(TEST_NID)

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [url, options] = mockFetch.mock.calls[0]
    expect(url).toBe(`https://api.numbersprotocol.io/api/v3/assets/${TEST_NID}/`)
    expect(options?.method).toBe('GET')
  })

  it('should send authorization header', async () => {
    const capture = new Capture({ token: 'my-token' })

    const mockFetch = vi.fn<typeof fetch>().mockResolvedValue({
      ok: true,
      json: async () => MOCK_ASSET_RESPONSE,
    } as Response)
    global.fetch = mockFetch

    await capture.get(TEST_NID)

    const [, options] = mockFetch.mock.calls[0]
    const headers = options?.headers as Record<string, string>
    expect(headers.Authorization).toBe('token my-token')
  })

  it('should parse asset response correctly', async () => {
    const capture = new Capture({ token: 'test-token' })

    const mockFetch = vi.fn<typeof fetch>().mockResolvedValue({
      ok: true,
      json: async () => MOCK_ASSET_RESPONSE,
    } as Response)
    global.fetch = mockFetch

    const asset = await capture.get(TEST_NID)

    expect(asset.nid).toBe(TEST_NID)
    expect(asset.filename).toBe('test.png')
    expect(asset.mimeType).toBe('image/png')
    expect(asset.caption).toBe('Test caption')
    expect(asset.headline).toBe('Test headline')
  })

  it('should throw ValidationError for empty nid', async () => {
    const capture = new Capture({ token: 'test-token' })

    await expect(capture.get('')).rejects.toThrow('nid is required')
  })

  it('should throw NotFoundError on 404 response', async () => {
    const capture = new Capture({ token: 'test-token' })

    const mockFetch = vi.fn<typeof fetch>().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ detail: 'Not found' }),
    } as Response)
    global.fetch = mockFetch

    await expect(capture.get(TEST_NID)).rejects.toThrow(NotFoundError)
  })

  it('should use custom base URL when configured', async () => {
    const capture = new Capture({ token: 'test-token', baseUrl: 'https://custom.api.com/v1' })

    const mockFetch = vi.fn<typeof fetch>().mockResolvedValue({
      ok: true,
      json: async () => MOCK_ASSET_RESPONSE,
    } as Response)
    global.fetch = mockFetch

    await capture.get(TEST_NID)

    const [url] = mockFetch.mock.calls[0]
    expect(url).toBe(`https://custom.api.com/v1/assets/${TEST_NID}/`)
  })
})

// Mock API URLs for history/tree tests
const HISTORY_API_URL =
  'https://e23hi68y55.execute-api.us-east-1.amazonaws.com/default/get-commits-storage-backend-jade-near'
const MERGE_TREE_API_URL =
  'https://us-central1-numbers-protocol-api.cloudfunctions.net/get-full-asset-tree'
const NFT_SEARCH_API_URL = 'https://eofveg1f59hrbn.m.pipedream.net'

const MOCK_HISTORY_RESPONSE = {
  nid: TEST_NID,
  commits: [
    {
      assetTreeCid: 'bafyreif123',
      txHash: '0xabc123',
      author: '0x1234',
      committer: '0x1234',
      timestampCreated: 1700000000,
      action: 'create',
    },
  ],
}

describe('getHistory()', () => {
  let originalFetch: typeof global.fetch

  beforeEach(() => {
    originalFetch = global.fetch
  })

  afterEach(() => {
    global.fetch = originalFetch
    vi.restoreAllMocks()
  })

  it('should GET history with nid query param', async () => {
    const capture = new Capture({ token: 'test-token' })

    const mockFetch = vi.fn<typeof fetch>().mockResolvedValue({
      ok: true,
      json: async () => MOCK_HISTORY_RESPONSE,
    } as Response)
    global.fetch = mockFetch

    await capture.getHistory(TEST_NID)

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [url] = mockFetch.mock.calls[0]
    expect(url.toString()).toContain(HISTORY_API_URL)
    expect(url.toString()).toContain(`nid=${TEST_NID}`)
  })

  it('should include testnet query param when testnet is true', async () => {
    const capture = new Capture({ token: 'test-token', testnet: true })

    const mockFetch = vi.fn<typeof fetch>().mockResolvedValue({
      ok: true,
      json: async () => MOCK_HISTORY_RESPONSE,
    } as Response)
    global.fetch = mockFetch

    await capture.getHistory(TEST_NID)

    const [url] = mockFetch.mock.calls[0]
    expect(url.toString()).toContain('testnet=true')
  })

  it('should NOT include testnet param when testnet is false', async () => {
    const capture = new Capture({ token: 'test-token', testnet: false })

    const mockFetch = vi.fn<typeof fetch>().mockResolvedValue({
      ok: true,
      json: async () => MOCK_HISTORY_RESPONSE,
    } as Response)
    global.fetch = mockFetch

    await capture.getHistory(TEST_NID)

    const [url] = mockFetch.mock.calls[0]
    expect(url.toString()).not.toContain('testnet')
  })

  it('should send authorization header', async () => {
    const capture = new Capture({ token: 'history-token' })

    const mockFetch = vi.fn<typeof fetch>().mockResolvedValue({
      ok: true,
      json: async () => MOCK_HISTORY_RESPONSE,
    } as Response)
    global.fetch = mockFetch

    await capture.getHistory(TEST_NID)

    const [, options] = mockFetch.mock.calls[0]
    const headers = options?.headers as Record<string, string>
    expect(headers.Authorization).toBe('token history-token')
  })

  it('should parse commits from response', async () => {
    const capture = new Capture({ token: 'test-token' })

    const mockFetch = vi.fn<typeof fetch>().mockResolvedValue({
      ok: true,
      json: async () => MOCK_HISTORY_RESPONSE,
    } as Response)
    global.fetch = mockFetch

    const commits = await capture.getHistory(TEST_NID)

    expect(commits).toHaveLength(1)
    expect(commits[0].assetTreeCid).toBe('bafyreif123')
    expect(commits[0].txHash).toBe('0xabc123')
    expect(commits[0].author).toBe('0x1234')
    expect(commits[0].timestamp).toBe(1700000000)
    expect(commits[0].action).toBe('create')
  })

  it('should throw ValidationError for empty nid', async () => {
    const capture = new Capture({ token: 'test-token' })

    await expect(capture.getHistory('')).rejects.toThrow('nid is required')
  })

  it('should throw error on non-ok history response', async () => {
    const capture = new Capture({ token: 'test-token' })

    const mockFetch = vi.fn<typeof fetch>().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({}),
    } as Response)
    global.fetch = mockFetch

    await expect(capture.getHistory(TEST_NID)).rejects.toThrow(NetworkError)
  })
})

describe('getAssetTree()', () => {
  let originalFetch: typeof global.fetch

  beforeEach(() => {
    originalFetch = global.fetch
  })

  afterEach(() => {
    global.fetch = originalFetch
    vi.restoreAllMocks()
  })

  const MOCK_MERGE_RESPONSE = {
    mergedAssetTree: {
      assetCid: 'bafybei123',
      assetSha256: 'abc123',
      creatorName: 'Test Creator',
      creatorWallet: '0x1234',
      createdAt: 1700000000,
      caption: 'Test caption',
      mimeType: 'image/png',
    },
    assetTrees: [],
  }

  it('should call history API then merge API', async () => {
    const capture = new Capture({ token: 'test-token' })

    const mockFetch = vi.fn<typeof fetch>()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => MOCK_HISTORY_RESPONSE,
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => MOCK_MERGE_RESPONSE,
      } as Response)
    global.fetch = mockFetch

    await capture.getAssetTree(TEST_NID)

    expect(mockFetch).toHaveBeenCalledTimes(2)
    const [firstUrl] = mockFetch.mock.calls[0]
    const [secondUrl] = mockFetch.mock.calls[1]
    expect(firstUrl.toString()).toContain(HISTORY_API_URL)
    expect(secondUrl.toString()).toBe(MERGE_TREE_API_URL)
  })

  it('should POST commit data to merge endpoint', async () => {
    const capture = new Capture({ token: 'test-token' })

    const mockFetch = vi.fn<typeof fetch>()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => MOCK_HISTORY_RESPONSE,
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => MOCK_MERGE_RESPONSE,
      } as Response)
    global.fetch = mockFetch

    await capture.getAssetTree(TEST_NID)

    const [, mergeOptions] = mockFetch.mock.calls[1]
    expect(mergeOptions?.method).toBe('POST')
    const body = JSON.parse(mergeOptions?.body as string)
    expect(body).toHaveLength(1)
    expect(body[0].assetTreeCid).toBe('bafyreif123')
    expect(body[0].timestampCreated).toBe(1700000000)
  })

  it('should parse merged asset tree response', async () => {
    const capture = new Capture({ token: 'test-token' })

    const mockFetch = vi.fn<typeof fetch>()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => MOCK_HISTORY_RESPONSE,
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => MOCK_MERGE_RESPONSE,
      } as Response)
    global.fetch = mockFetch

    const tree = await capture.getAssetTree(TEST_NID)

    expect(tree.assetCid).toBe('bafybei123')
    expect(tree.assetSha256).toBe('abc123')
    expect(tree.creatorName).toBe('Test Creator')
    expect(tree.creatorWallet).toBe('0x1234')
    expect(tree.caption).toBe('Test caption')
    expect(tree.mimeType).toBe('image/png')
  })

  it('should throw CaptureError when no commits found', async () => {
    const capture = new Capture({ token: 'test-token' })

    const emptyHistoryResponse = { nid: TEST_NID, commits: [] }
    const mockFetch = vi.fn<typeof fetch>().mockResolvedValue({
      ok: true,
      json: async () => emptyHistoryResponse,
    } as Response)
    global.fetch = mockFetch

    await expect(capture.getAssetTree(TEST_NID)).rejects.toThrow('No commits found for asset')
  })

  it('should throw ValidationError for empty nid', async () => {
    const capture = new Capture({ token: 'test-token' })

    await expect(capture.getAssetTree('')).rejects.toThrow('nid is required')
  })
})

describe('searchNft()', () => {
  let originalFetch: typeof global.fetch

  beforeEach(() => {
    originalFetch = global.fetch
  })

  afterEach(() => {
    global.fetch = originalFetch
    vi.restoreAllMocks()
  })

  const MOCK_NFT_RESPONSE = {
    records: [
      {
        token_id: '42',
        contract: '0xContract',
        network: 'ethereum',
        owner: '0xOwner',
      },
    ],
    order_id: 'nft-order-123',
  }

  it('should POST to NFT search endpoint with nid in JSON body', async () => {
    const capture = new Capture({ token: 'test-token' })

    const mockFetch = vi.fn<typeof fetch>().mockResolvedValue({
      ok: true,
      json: async () => MOCK_NFT_RESPONSE,
    } as Response)
    global.fetch = mockFetch

    await capture.searchNft(TEST_NID)

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [url, options] = mockFetch.mock.calls[0]
    expect(url.toString()).toBe(NFT_SEARCH_API_URL)
    expect(options?.method).toBe('POST')

    const body = JSON.parse(options?.body as string)
    expect(body.nid).toBe(TEST_NID)
  })

  it('should send authorization header', async () => {
    const capture = new Capture({ token: 'nft-token' })

    const mockFetch = vi.fn<typeof fetch>().mockResolvedValue({
      ok: true,
      json: async () => MOCK_NFT_RESPONSE,
    } as Response)
    global.fetch = mockFetch

    await capture.searchNft(TEST_NID)

    const [, options] = mockFetch.mock.calls[0]
    const headers = options?.headers as Record<string, string>
    expect(headers.Authorization).toBe('token nft-token')
  })

  it('should send Content-Type application/json header', async () => {
    const capture = new Capture({ token: 'test-token' })

    const mockFetch = vi.fn<typeof fetch>().mockResolvedValue({
      ok: true,
      json: async () => MOCK_NFT_RESPONSE,
    } as Response)
    global.fetch = mockFetch

    await capture.searchNft(TEST_NID)

    const [, options] = mockFetch.mock.calls[0]
    const headers = options?.headers as Record<string, string>
    expect(headers['Content-Type']).toBe('application/json')
  })

  it('should parse NFT records from response', async () => {
    const capture = new Capture({ token: 'test-token' })

    const mockFetch = vi.fn<typeof fetch>().mockResolvedValue({
      ok: true,
      json: async () => MOCK_NFT_RESPONSE,
    } as Response)
    global.fetch = mockFetch

    const result = await capture.searchNft(TEST_NID)

    expect(result.records).toHaveLength(1)
    expect(result.records[0].tokenId).toBe('42')
    expect(result.records[0].contract).toBe('0xContract')
    expect(result.records[0].network).toBe('ethereum')
    expect(result.records[0].owner).toBe('0xOwner')
    expect(result.orderId).toBe('nft-order-123')
  })

  it('should handle empty NFT records', async () => {
    const capture = new Capture({ token: 'test-token' })

    const mockFetch = vi.fn<typeof fetch>().mockResolvedValue({
      ok: true,
      json: async () => ({ records: [], order_id: 'empty-order' }),
    } as Response)
    global.fetch = mockFetch

    const result = await capture.searchNft(TEST_NID)

    expect(result.records).toHaveLength(0)
    expect(result.orderId).toBe('empty-order')
  })

  it('should throw ValidationError for empty nid', async () => {
    const capture = new Capture({ token: 'test-token' })

    await expect(capture.searchNft('')).rejects.toThrow('nid is required for NFT search')
  })

  it('should throw error on non-ok NFT search response', async () => {
    const capture = new Capture({ token: 'test-token' })

    const mockFetch = vi.fn<typeof fetch>().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ message: 'Unauthorized' }),
    } as Response)
    global.fetch = mockFetch

    await expect(capture.searchNft(TEST_NID)).rejects.toThrow(AuthenticationError)
  })
})

describe('normalizeFile() via register()', () => {
  let originalFetch: typeof global.fetch

  beforeEach(() => {
    originalFetch = global.fetch
  })

  afterEach(() => {
    global.fetch = originalFetch
    vi.restoreAllMocks()
  })

  it('should handle Uint8Array input with provided filename', async () => {
    const capture = new Capture({ token: 'test-token' })

    const mockFetch = vi.fn<typeof fetch>().mockResolvedValue({
      ok: true,
      json: async () => ({ ...MOCK_ASSET_RESPONSE, asset_file_name: 'data.json' }),
    } as Response)
    global.fetch = mockFetch

    const data = new Uint8Array([123, 34, 107, 34, 58, 49, 125]) // {"k":1}
    await capture.register(data, { filename: 'data.json' })

    const [, options] = mockFetch.mock.calls[0]
    const formData = options?.body as FormData
    const fileBlob = formData.get('asset_file') as File
    expect(fileBlob).toBeTruthy()
    expect(fileBlob.type).toBe('application/json')
  })

  it('should infer MIME type from filename extension', async () => {
    const capture = new Capture({ token: 'test-token' })

    const mockFetch = vi.fn<typeof fetch>().mockResolvedValue({
      ok: true,
      json: async () => MOCK_ASSET_RESPONSE,
    } as Response)
    global.fetch = mockFetch

    const data = new Uint8Array([1, 2, 3, 4])
    await capture.register(data, { filename: 'photo.jpg' })

    const [, options] = mockFetch.mock.calls[0]
    const formData = options?.body as FormData
    const fileBlob = formData.get('asset_file') as File
    expect(fileBlob.type).toBe('image/jpeg')
  })

  it('should handle Blob input with provided filename', async () => {
    const capture = new Capture({ token: 'test-token' })

    const mockFetch = vi.fn<typeof fetch>().mockResolvedValue({
      ok: true,
      json: async () => MOCK_ASSET_RESPONSE,
    } as Response)
    global.fetch = mockFetch

    const blob = new Blob(['hello world'], { type: 'text/plain' })
    await capture.register(blob, { filename: 'readme.txt' })

    const [, options] = mockFetch.mock.calls[0]
    const formData = options?.body as FormData
    expect(formData.has('asset_file')).toBe(true)
  })

  it('should throw ValidationError for Blob without filename', async () => {
    const capture = new Capture({ token: 'test-token' })

    const blob = new Blob(['hello world'], { type: 'text/plain' })
    await expect(capture.register(blob)).rejects.toThrow('filename is required for Blob input')
  })
})
