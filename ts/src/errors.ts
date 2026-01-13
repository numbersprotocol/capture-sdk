/**
 * Base error class for all Capture SDK errors.
 */
export class CaptureError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode?: number
  ) {
    super(message)
    this.name = 'CaptureError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

/**
 * Thrown when authentication fails (invalid or missing token).
 */
export class AuthenticationError extends CaptureError {
  constructor(message = 'Invalid or missing authentication token') {
    super(message, 'AUTHENTICATION_ERROR', 401)
    this.name = 'AuthenticationError'
  }
}

/**
 * Thrown when user lacks permission for the requested operation.
 */
export class PermissionError extends CaptureError {
  constructor(message = 'Insufficient permissions for this operation') {
    super(message, 'PERMISSION_ERROR', 403)
    this.name = 'PermissionError'
  }
}

/**
 * Thrown when the requested asset is not found.
 */
export class NotFoundError extends CaptureError {
  constructor(nid?: string) {
    super(nid ? `Asset not found: ${nid}` : 'Asset not found', 'NOT_FOUND', 404)
    this.name = 'NotFoundError'
  }
}

/**
 * Thrown when wallet has insufficient NUM tokens.
 */
export class InsufficientFundsError extends CaptureError {
  constructor(message = 'Insufficient NUM tokens for this operation') {
    super(message, 'INSUFFICIENT_FUNDS', 400)
    this.name = 'InsufficientFundsError'
  }
}

/**
 * Thrown when input validation fails.
 */
export class ValidationError extends CaptureError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR')
    this.name = 'ValidationError'
  }
}

/**
 * Thrown when a network or API request fails.
 */
export class NetworkError extends CaptureError {
  constructor(message: string, statusCode?: number) {
    super(message, 'NETWORK_ERROR', statusCode)
    this.name = 'NetworkError'
  }
}

/**
 * Maps HTTP status codes to appropriate error classes.
 * @internal
 */
export function createApiError(
  statusCode: number,
  message: string,
  nid?: string
): CaptureError {
  switch (statusCode) {
    case 400:
      if (message.toLowerCase().includes('insufficient')) {
        return new InsufficientFundsError(message)
      }
      return new ValidationError(message)
    case 401:
      return new AuthenticationError(message)
    case 403:
      return new PermissionError(message)
    case 404:
      return new NotFoundError(nid)
    default:
      return new NetworkError(message, statusCode)
  }
}
