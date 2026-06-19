/**
 * Unit tests for Capture SDK client.
 *
 * These tests verify request construction and response parsing,
 * including correct authentication header format.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Capture } from './client.js'

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

describe('URL overrides', () => {
  let originalFetch: typeof global.fetch

  beforeEach(() => {
    originalFetch = global.fetch
  })

  afterEach(() => {
    global.fetch = originalFetch
    vi.restoreAllMocks()
  })

  it('should use custom assetSearchApiUrl when provided', async () => {
    const customUrl = 'https://custom-search.example.com/search'
    const capture = new Capture({
      token: 'test-token',
      assetSearchApiUrl: customUrl,
    })

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

    const [url] = mockFetch.mock.calls[0]
    expect(url).toBe(customUrl)
  })

  it('should use custom nftSearchApiUrl when provided', async () => {
    const customUrl = 'https://custom-nft.example.com/search'
    const capture = new Capture({
      token: 'test-token',
      nftSearchApiUrl: customUrl,
    })

    const mockFetch = vi.fn<typeof fetch>().mockResolvedValue({
      ok: true,
      json: async () => ({
        records: [],
        order_id: 'test-order',
      }),
    } as Response)

    global.fetch = mockFetch

    await capture.searchNft(TEST_NID)

    const [url] = mockFetch.mock.calls[0]
    expect(url).toBe(customUrl)
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

  it('should fetch asset by NID', async () => {
    const mockFetch = vi.fn<typeof fetch>().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: TEST_NID,
        asset_file_name: 'photo.jpg',
        asset_file_mime_type: 'image/jpeg',
        caption: 'My photo',
        headline: 'Demo',
      }),
    } as Response)

    global.fetch = mockFetch

    const capture = new Capture({ token: 'test-token' })
    const asset = await capture.get(TEST_NID)

    expect(asset.nid).toBe(TEST_NID)
    expect(asset.filename).toBe('photo.jpg')
    expect(asset.mimeType).toBe('image/jpeg')
    expect(asset.caption).toBe('My photo')
    expect(asset.headline).toBe('Demo')
  })

  it('should throw ValidationError when NID is empty', async () => {
    const capture = new Capture({ token: 'test-token' })
    await expect(capture.get('')).rejects.toThrow('nid is required')
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

  it('should throw ValidationError when NID is empty', async () => {
    const capture = new Capture({ token: 'test-token' })
    await expect(capture.searchNft('')).rejects.toThrow(
      'nid is required for NFT search'
    )
  })

  it('should return NFT search result', async () => {
    const mockFetch = vi.fn<typeof fetch>().mockResolvedValue({
      ok: true,
      json: async () => ({
        records: [
          {
            token_id: '1',
            contract: '0xabc',
            network: 'ethereum',
            owner: '0xowner',
          },
        ],
        order_id: 'order_nft',
      }),
    } as Response)

    global.fetch = mockFetch

    const capture = new Capture({ token: 'test-token' })
    const result = await capture.searchNft(TEST_NID)

    expect(result.records).toHaveLength(1)
    expect(result.records[0].tokenId).toBe('1')
    expect(result.records[0].contract).toBe('0xabc')
    expect(result.records[0].network).toBe('ethereum')
    expect(result.orderId).toBe('order_nft')
  })
})

describe('register() validation', () => {
  it('should throw ValidationError when headline exceeds 25 chars', async () => {
    const capture = new Capture({ token: 'test-token' })
    const longHeadline = 'a'.repeat(26)

    await expect(
      capture.register(new Uint8Array([1, 2, 3]), {
        headline: longHeadline,
        filename: 'test.bin',
      })
    ).rejects.toThrow('headline must be 25 characters or less')
  })

  it('should throw ValidationError for empty file', async () => {
    const capture = new Capture({ token: 'test-token' })

    await expect(
      capture.register(new Uint8Array(0), { filename: 'empty.bin' })
    ).rejects.toThrow('file cannot be empty')
  })
})

describe('update() validation', () => {
  it('should throw ValidationError when NID is empty', async () => {
    const capture = new Capture({ token: 'test-token' })

    await expect(capture.update('', { caption: 'test' })).rejects.toThrow(
      'nid is required'
    )
  })

  it('should throw ValidationError when headline exceeds 25 chars', async () => {
    const capture = new Capture({ token: 'test-token' })
    const longHeadline = 'a'.repeat(26)

    await expect(
      capture.update(TEST_NID, { headline: longHeadline })
    ).rejects.toThrow('headline must be 25 characters or less')
  })
})
