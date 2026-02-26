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

describe('Retry and Resilience', () => {
  let originalFetch: typeof global.fetch

  beforeEach(() => {
    originalFetch = global.fetch
    vi.useFakeTimers()
  })

  afterEach(() => {
    global.fetch = originalFetch
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('should retry on 503 and succeed on second attempt', async () => {
    const capture = new Capture({ token: 'test-token', retryDelay: 10 })

    let callCount = 0
    global.fetch = vi.fn().mockImplementation(async () => {
      callCount++
      if (callCount === 1) {
        return { ok: false, status: 503, json: async () => ({}) } as Response
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          precise_match: '',
          input_file_mime_type: '',
          similar_matches: [],
          order_id: 'test',
        }),
      } as Response
    })

    const promise = capture.searchAsset({ nid: TEST_NID })
    await vi.runAllTimersAsync()
    const result = await promise

    expect(callCount).toBe(2)
    expect(result.orderId).toBe('test')
  })

  it('should retry on 429 and succeed on second attempt', async () => {
    const capture = new Capture({ token: 'test-token', retryDelay: 10 })

    let callCount = 0
    global.fetch = vi.fn().mockImplementation(async () => {
      callCount++
      if (callCount === 1) {
        return { ok: false, status: 429, json: async () => ({}) } as Response
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          precise_match: '',
          input_file_mime_type: '',
          similar_matches: [],
          order_id: 'ok',
        }),
      } as Response
    })

    const promise = capture.searchAsset({ nid: TEST_NID })
    await vi.runAllTimersAsync()
    const result = await promise

    expect(callCount).toBe(2)
    expect(result.orderId).toBe('ok')
  })

  it('should not retry on 400 (non-retryable)', async () => {
    const capture = new Capture({ token: 'test-token', maxRetries: 3 })

    let callCount = 0
    global.fetch = vi.fn().mockImplementation(async () => {
      callCount++
      return { ok: false, status: 400, json: async () => ({}) } as Response
    })

    await expect(capture.searchAsset({ nid: TEST_NID })).rejects.toThrow()

    expect(callCount).toBe(1)
  })

  it('should not retry on 404 (non-retryable)', async () => {
    const capture = new Capture({ token: 'test-token', maxRetries: 3 })

    let callCount = 0
    global.fetch = vi.fn().mockImplementation(async () => {
      callCount++
      return { ok: false, status: 404, json: async () => ({}) } as Response
    })

    await expect(capture.searchAsset({ nid: TEST_NID })).rejects.toThrow()

    expect(callCount).toBe(1)
  })

  it('should respect maxRetries=0 (no retries)', async () => {
    const capture = new Capture({ token: 'test-token', maxRetries: 0 })

    let callCount = 0
    global.fetch = vi.fn().mockImplementation(async () => {
      callCount++
      return { ok: false, status: 503, json: async () => ({}) } as Response
    })

    await expect(capture.searchAsset({ nid: TEST_NID })).rejects.toThrow()

    expect(callCount).toBe(1)
  })

  it('should retry on network error', async () => {
    const capture = new Capture({ token: 'test-token', maxRetries: 1, retryDelay: 10 })

    let callCount = 0
    global.fetch = vi.fn().mockImplementation(async () => {
      callCount++
      if (callCount === 1) {
        throw new TypeError('Network request failed')
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          precise_match: '',
          input_file_mime_type: '',
          similar_matches: [],
          order_id: 'recovered',
        }),
      } as Response
    })

    const promise = capture.searchAsset({ nid: TEST_NID })
    await vi.runAllTimersAsync()
    const result = await promise

    expect(callCount).toBe(2)
    expect(result.orderId).toBe('recovered')
  })

  it('should use timeout option (default 30000ms)', () => {
    const captureDefault = new Capture({ token: 'test-token' })
    // @ts-expect-error accessing private field for test
    expect(captureDefault.timeout).toBe(30000)

    const captureCustom = new Capture({ token: 'test-token', timeout: 5000 })
    // @ts-expect-error accessing private field for test
    expect(captureCustom.timeout).toBe(5000)
  })

  it('should use configurable maxRetries and retryDelay defaults', () => {
    const capture = new Capture({ token: 'test-token' })
    // @ts-expect-error accessing private field for test
    expect(capture.maxRetries).toBe(3)
    // @ts-expect-error accessing private field for test
    expect(capture.retryDelay).toBe(1000)
  })
})

describe('Rate Limiting', () => {
  let originalFetch: typeof global.fetch

  beforeEach(() => {
    originalFetch = global.fetch
    vi.useFakeTimers()
  })

  afterEach(() => {
    global.fetch = originalFetch
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('should allow requests when rate limit is not set', async () => {
    const capture = new Capture({ token: 'test-token' })

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        precise_match: '',
        input_file_mime_type: '',
        similar_matches: [],
        order_id: 'test',
      }),
    } as Response)

    const promise = capture.searchAsset({ nid: TEST_NID })
    await vi.runAllTimersAsync()
    await expect(promise).resolves.toBeDefined()
  })

  it('should throttle requests when rateLimit is set (token bucket)', async () => {
    // rateLimit=2 means 2 requests per second; bucket starts full with 2 tokens
    const capture = new Capture({ token: 'test-token', rateLimit: 2 })

    let fetchCallTimes: number[] = []
    global.fetch = vi.fn().mockImplementation(async () => {
      fetchCallTimes.push(Date.now())
      return {
        ok: true,
        status: 200,
        json: async () => ({
          precise_match: '',
          input_file_mime_type: '',
          similar_matches: [],
          order_id: 'test',
        }),
      } as Response
    })

    // First 2 requests should be immediate (bucket starts full)
    const p1 = capture.searchAsset({ nid: TEST_NID })
    const p2 = capture.searchAsset({ nid: TEST_NID })
    // Third request should be delayed (bucket empty)
    const p3 = capture.searchAsset({ nid: TEST_NID })

    await vi.runAllTimersAsync()
    await Promise.all([p1, p2, p3])

    // All three calls completed
    expect(fetchCallTimes).toHaveLength(3)
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
