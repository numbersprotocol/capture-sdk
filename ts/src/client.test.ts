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
  let mockFetch: ReturnType<typeof vi.fn>
  let originalFetch: typeof global.fetch

  beforeEach(() => {
    // Store original fetch
    originalFetch = global.fetch

    // Create mock fetch
    mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        precise_match: '',
        input_file_mime_type: '',
        similar_matches: [],
        order_id: 'test-order',
      }),
    })

    // Replace global fetch
    global.fetch = mockFetch
  })

  afterEach(() => {
    // Restore original fetch
    global.fetch = originalFetch
    vi.restoreAllMocks()
  })

  it('should send Authorization header with correct format', async () => {
    const testToken = 'my-secret-token'
    const capture = new Capture({ token: testToken })

    await capture.searchAsset({ nid: TEST_NID })

    // Verify fetch was called
    expect(mockFetch).toHaveBeenCalledTimes(1)

    // Get the request options
    const [url, options] = mockFetch.mock.calls[0]
    expect(url).toBe(ASSET_SEARCH_API_URL)

    // Verify Authorization header format: "token {token_value}"
    expect(options.headers).toBeDefined()
    expect(options.headers.Authorization).toBe(`token ${testToken}`)
  })

  it('should NOT send token in form data', async () => {
    const testToken = 'my-secret-token'
    const capture = new Capture({ token: testToken })

    await capture.searchAsset({ nid: TEST_NID })

    // Get the request body (FormData)
    const [, options] = mockFetch.mock.calls[0]
    const formData = options.body as FormData

    // Token should NOT be in form data
    expect(formData.has('token')).toBe(false)

    // Verify token is not in any form field
    const formEntries = Array.from(formData.entries())
    const hasTokenInFormData = formEntries.some(
      ([, value]) => value === testToken
    )
    expect(hasTokenInFormData).toBe(false)
  })

  it('should send NID in form data when searching by NID', async () => {
    const capture = new Capture({ token: 'test-token' })

    await capture.searchAsset({ nid: TEST_NID })

    // Get the request body (FormData)
    const [, options] = mockFetch.mock.calls[0]
    const formData = options.body as FormData

    // NID should be in form data
    expect(formData.get('nid')).toBe(TEST_NID)
  })

  it('should send URL in form data when searching by URL', async () => {
    const capture = new Capture({ token: 'test-token' })
    const testUrl = 'https://example.com/image.jpg'

    await capture.searchAsset({ fileUrl: testUrl })

    // Get the request body (FormData)
    const [, options] = mockFetch.mock.calls[0]
    const formData = options.body as FormData

    // URL should be in form data
    expect(formData.get('url')).toBe(testUrl)
  })

  it('should send optional parameters in form data', async () => {
    const capture = new Capture({ token: 'test-token' })

    await capture.searchAsset({
      nid: TEST_NID,
      threshold: 0.5,
      sampleCount: 10,
    })

    // Get the request body (FormData)
    const [, options] = mockFetch.mock.calls[0]
    const formData = options.body as FormData

    // Optional params should be in form data
    expect(formData.get('threshold')).toBe('0.5')
    expect(formData.get('sample_count')).toBe('10')
  })
})

describe('Asset Search Response Parsing', () => {
  let mockFetch: ReturnType<typeof vi.fn>
  let originalFetch: typeof global.fetch

  beforeEach(() => {
    originalFetch = global.fetch
  })

  afterEach(() => {
    global.fetch = originalFetch
    vi.restoreAllMocks()
  })

  it('should parse precise match from response', async () => {
    mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        precise_match: TEST_NID,
        input_file_mime_type: 'image/png',
        similar_matches: [],
        order_id: 'order_123',
      }),
    })
    global.fetch = mockFetch

    const capture = new Capture({ token: 'test-token' })
    const result = await capture.searchAsset({ nid: TEST_NID })

    expect(result.preciseMatch).toBe(TEST_NID)
  })

  it('should parse similar matches from response', async () => {
    mockFetch = vi.fn().mockResolvedValue({
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
    })
    global.fetch = mockFetch

    const capture = new Capture({ token: 'test-token' })
    const result = await capture.searchAsset({ nid: TEST_NID })

    expect(result.similarMatches).toHaveLength(2)
    expect(result.similarMatches[0].nid).toBe('bafybei111')
    expect(result.similarMatches[0].distance).toBe(0.05)
  })

  it('should parse order ID from response', async () => {
    mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        precise_match: '',
        input_file_mime_type: '',
        similar_matches: [],
        order_id: 'order_456',
      }),
    })
    global.fetch = mockFetch

    const capture = new Capture({ token: 'test-token' })
    const result = await capture.searchAsset({ nid: TEST_NID })

    expect(result.orderId).toBe('order_456')
  })

  it('should parse MIME type from response', async () => {
    mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        precise_match: '',
        input_file_mime_type: 'image/jpeg',
        similar_matches: [],
        order_id: 'order_123',
      }),
    })
    global.fetch = mockFetch

    const capture = new Capture({ token: 'test-token' })
    const result = await capture.searchAsset({ nid: TEST_NID })

    expect(result.inputFileMimeType).toBe('image/jpeg')
  })

  it('should handle empty similar matches', async () => {
    mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        precise_match: TEST_NID,
        input_file_mime_type: 'image/png',
        similar_matches: [],
        order_id: 'order_123',
      }),
    })
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
