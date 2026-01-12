// Main client
export { Capture } from './client.js'

// Types
export type {
  FileInput,
  CaptureOptions,
  RegisterOptions,
  UpdateOptions,
  SignOptions,
  Asset,
  Commit,
  AssetTree,
  // Verify Engine types
  VerifyInput,
  VerifyOptions,
  VerifyResult,
  SimilarAsset,
  NFTMatch,
} from './types.js'

// Errors
export {
  CaptureError,
  AuthenticationError,
  PermissionError,
  NotFoundError,
  InsufficientFundsError,
  ValidationError,
  NetworkError,
} from './errors.js'

// Crypto utilities (for advanced users)
export { sha256, verifySignature } from './crypto.js'
