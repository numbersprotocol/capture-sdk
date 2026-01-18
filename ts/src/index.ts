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
  AssetSearchOptions,
  AssetSearchResult,
  SimilarMatch,
  NftSearchResult,
  NftRecord,
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

// Verify Engine URL helpers
export { VerifyUrls } from './verify.js'
