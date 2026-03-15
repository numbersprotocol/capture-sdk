/**
 * Unit tests for Capture SDK error classes.
 */

import { describe, it, expect } from 'vitest'
import {
  CaptureError,
  AuthenticationError,
  PermissionError,
  NotFoundError,
  InsufficientFundsError,
  ValidationError,
  NetworkError,
  createApiError,
} from './errors.js'

describe('CaptureError', () => {
  it('should create error with message, code and statusCode', () => {
    const err = new CaptureError('test message', 'TEST_CODE', 500)
    expect(err.message).toBe('test message')
    expect(err.code).toBe('TEST_CODE')
    expect(err.statusCode).toBe(500)
    expect(err.name).toBe('CaptureError')
  })

  it('should be an instance of Error', () => {
    const err = new CaptureError('test', 'CODE')
    expect(err).toBeInstanceOf(Error)
    expect(err).toBeInstanceOf(CaptureError)
  })

  it('should work without statusCode', () => {
    const err = new CaptureError('test', 'CODE')
    expect(err.statusCode).toBeUndefined()
  })
})

describe('AuthenticationError', () => {
  it('should have correct defaults', () => {
    const err = new AuthenticationError()
    expect(err.code).toBe('AUTHENTICATION_ERROR')
    expect(err.statusCode).toBe(401)
    expect(err.name).toBe('AuthenticationError')
  })

  it('should accept custom message', () => {
    const err = new AuthenticationError('Custom auth error')
    expect(err.message).toBe('Custom auth error')
  })

  it('should be instanceof CaptureError', () => {
    const err = new AuthenticationError()
    expect(err).toBeInstanceOf(CaptureError)
    expect(err).toBeInstanceOf(AuthenticationError)
  })
})

describe('PermissionError', () => {
  it('should have correct defaults', () => {
    const err = new PermissionError()
    expect(err.code).toBe('PERMISSION_ERROR')
    expect(err.statusCode).toBe(403)
    expect(err.name).toBe('PermissionError')
  })

  it('should be instanceof CaptureError', () => {
    expect(new PermissionError()).toBeInstanceOf(CaptureError)
  })
})

describe('NotFoundError', () => {
  it('should include NID in message when provided', () => {
    const nid = 'bafybei123'
    const err = new NotFoundError(nid)
    expect(err.message).toBe(`Asset not found: ${nid}`)
    expect(err.code).toBe('NOT_FOUND')
    expect(err.statusCode).toBe(404)
    expect(err.name).toBe('NotFoundError')
  })

  it('should use generic message without NID', () => {
    const err = new NotFoundError()
    expect(err.message).toBe('Asset not found')
  })

  it('should be instanceof CaptureError', () => {
    expect(new NotFoundError()).toBeInstanceOf(CaptureError)
  })
})

describe('InsufficientFundsError', () => {
  it('should have correct defaults', () => {
    const err = new InsufficientFundsError()
    expect(err.code).toBe('INSUFFICIENT_FUNDS')
    expect(err.statusCode).toBe(400)
    expect(err.name).toBe('InsufficientFundsError')
  })

  it('should be instanceof CaptureError', () => {
    expect(new InsufficientFundsError()).toBeInstanceOf(CaptureError)
  })
})

describe('ValidationError', () => {
  it('should set correct code and name', () => {
    const err = new ValidationError('Invalid input')
    expect(err.message).toBe('Invalid input')
    expect(err.code).toBe('VALIDATION_ERROR')
    expect(err.name).toBe('ValidationError')
    expect(err.statusCode).toBeUndefined()
  })

  it('should be instanceof CaptureError', () => {
    expect(new ValidationError('msg')).toBeInstanceOf(CaptureError)
  })
})

describe('NetworkError', () => {
  it('should create with message and optional statusCode', () => {
    const err = new NetworkError('Connection failed', 503)
    expect(err.message).toBe('Connection failed')
    expect(err.code).toBe('NETWORK_ERROR')
    expect(err.statusCode).toBe(503)
    expect(err.name).toBe('NetworkError')
  })

  it('should work without statusCode', () => {
    const err = new NetworkError('Connection failed')
    expect(err.statusCode).toBeUndefined()
  })

  it('should be instanceof CaptureError', () => {
    expect(new NetworkError('msg')).toBeInstanceOf(CaptureError)
  })
})

describe('createApiError', () => {
  it('should return AuthenticationError for 401', () => {
    const err = createApiError(401, 'Unauthorized')
    expect(err).toBeInstanceOf(AuthenticationError)
    expect(err.statusCode).toBe(401)
  })

  it('should return PermissionError for 403', () => {
    const err = createApiError(403, 'Forbidden')
    expect(err).toBeInstanceOf(PermissionError)
    expect(err.statusCode).toBe(403)
  })

  it('should return NotFoundError for 404', () => {
    const err = createApiError(404, 'Not found')
    expect(err).toBeInstanceOf(NotFoundError)
    expect(err.statusCode).toBe(404)
  })

  it('should return NotFoundError with NID when provided', () => {
    const nid = 'bafybei123'
    const err = createApiError(404, 'Not found', nid)
    expect(err).toBeInstanceOf(NotFoundError)
    expect(err.message).toBe(`Asset not found: ${nid}`)
  })

  it('should return InsufficientFundsError for 400 with insufficient message', () => {
    const err = createApiError(400, 'Insufficient NUM tokens')
    expect(err).toBeInstanceOf(InsufficientFundsError)
  })

  it('should return ValidationError for 400 without insufficient message', () => {
    const err = createApiError(400, 'Bad request')
    expect(err).toBeInstanceOf(ValidationError)
  })

  it('should return NetworkError for other status codes', () => {
    const err = createApiError(500, 'Server error')
    expect(err).toBeInstanceOf(NetworkError)
    expect(err.statusCode).toBe(500)

    const err503 = createApiError(503, 'Service unavailable')
    expect(err503).toBeInstanceOf(NetworkError)
    expect(err503.statusCode).toBe(503)
  })
})
