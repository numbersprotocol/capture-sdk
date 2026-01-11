# Capture SDK Implementation Plan

## Overview

A TypeScript SDK for interacting with the Numbers Protocol Capture API, providing functionality for:
1. Registering new digital assets with cryptographic integrity proofs
2. Committing updates to registered assets
3. Retrieving the merged asset tree (full provenance history)

## Architecture

```
capture-sdk/
├── src/
│   ├── index.ts                 # Main entry point, exports public API
│   ├── client.ts                # CaptureClient class - main SDK interface
│   ├── types.ts                 # TypeScript type definitions
│   ├── api/
│   │   ├── assets.ts            # Asset registration & update API calls
│   │   └── history.ts           # Asset history & tree retrieval
│   ├── crypto/
│   │   ├── hash.ts              # SHA-256 hashing utilities
│   │   └── signature.ts         # EIP-191 signature generation
│   └── utils/
│       └── mime.ts              # MIME type detection
├── package.json
├── tsconfig.json
└── README.md
```

## Core Components

### 1. CaptureClient Class

Main entry point for the SDK. Requires:
- `captureToken`: Authentication token for API access
- `privateKey` (optional): Ethereum private key for signing (can be provided per-call)

```typescript
class CaptureClient {
  constructor(options: CaptureClientOptions)

  // Core methods
  async registerAsset(options: RegisterAssetOptions): Promise<Asset>
  async commitUpdate(nid: string, options: CommitUpdateOptions): Promise<Asset>
  async getAssetTree(nid: string): Promise<MergedAssetTree>

  // Utility methods
  async getAsset(nid: string): Promise<Asset>
  async listAssets(options?: ListAssetsOptions): Promise<Asset[]>
  async getAssetHistory(nid: string): Promise<CommitHistory>
}
```

### 2. Type Definitions

```typescript
interface CaptureClientOptions {
  captureToken: string
  privateKey?: string           // Optional: for signing
  baseUrl?: string              // Default: https://api.numbersprotocol.io/api/v3
  testnet?: boolean             // Default: false
}

interface RegisterAssetOptions {
  file: File | Buffer | Blob
  filename: string
  mimeType?: string             // Auto-detected if not provided
  caption?: string
  headline?: string             // Max 25 chars
  publicAccess?: boolean        // Default: true (pin to IPFS)
  privateKey?: string           // Override client-level key
}

interface CommitUpdateOptions {
  caption?: string
  headline?: string
  commitMessage?: string
  customMetadata?: Record<string, unknown>
}

interface Asset {
  id: string                    // NID (Numbers ID)
  assetFileName: string
  assetFileMimeType: string
  caption?: string
  headline?: string
}

interface IntegrityProof {
  proofHash: string             // SHA-256 of asset
  assetMimeType: string
  createdAt: number             // Unix timestamp
}

interface AssetSignature {
  proofHash: string
  provider: string
  signature: string             // EIP-191 signature
  publicKey: string             // Ethereum address
  integritySha: string          // SHA-256 of signed metadata
}

interface Commit {
  assetTreeCid: string
  txHash: string
  author: string
  committer: string
  timestamp: number
  action: string
}

interface CommitHistory {
  nid: string
  commits: Commit[]
}

interface MergedAssetTree {
  // Merged asset tree fields from all commits
  [key: string]: unknown
}
```

### 3. API Endpoints Used

| Feature | Method | Endpoint | Cost |
|---------|--------|----------|------|
| Register Asset | POST | `/api/v3/assets/` | 0.1 NUM + gas |
| Update Asset | PATCH | `/api/v3/assets/{nid}/` | 0.1 NUM + gas |
| Get Asset | GET | `/api/v3/assets/{nid}/` | Free |
| List Assets | GET | `/api/v3/assets/` | Free |
| Get History | GET | AWS Lambda endpoint | Free |
| Merge AssetTrees | POST | Cloud Function endpoint | Free |

### 4. Crypto Module

**Hash Generation:**
- SHA-256 hash of file content for `proofHash`
- SHA-256 hash of signed metadata JSON for `integritySha`

**Signature Generation (EIP-191):**
- Sign the integrity proof using Ethereum wallet
- Compatible with `ethers.js` signing

```typescript
// Integrity proof structure to be signed
const signedMetadata = {
  proof_hash: "<sha256-of-file>",
  asset_mime_type: "<mime-type>",
  created_at: <unix-timestamp>
}

// Signature structure
const signature = {
  proofHash: signedMetadata.proof_hash,
  provider: "capture-sdk",
  signature: "<eip191-signature>",
  publicKey: "<ethereum-address>",
  integritySha: "<sha256-of-signed-metadata>"
}
```

## Implementation Steps

### Phase 1: Project Setup
1. Initialize TypeScript project with proper configuration
2. Set up package.json with dependencies:
   - `ethers` (v6) - for EIP-191 signing
   - `mime` - for MIME type detection
3. Configure tsconfig.json for ES modules and Node.js compatibility

### Phase 2: Core Types & Utilities
1. Define all TypeScript interfaces in `types.ts`
2. Implement SHA-256 hashing utilities (using Node.js crypto or Web Crypto API)
3. Implement EIP-191 signature generation using ethers.js
4. Implement MIME type detection utility

### Phase 3: API Layer
1. Implement asset registration API call (`POST /api/v3/assets/`)
   - Build multipart form data
   - Include signed_metadata and signature
2. Implement asset update API call (`PATCH /api/v3/assets/{nid}/`)
3. Implement asset retrieval (`GET /api/v3/assets/{nid}/`)
4. Implement asset listing (`GET /api/v3/assets/`)
5. Implement commit history retrieval (AWS Lambda endpoint)
6. Implement asset tree merging (Cloud Function endpoint)

### Phase 4: CaptureClient Class
1. Implement constructor with configuration validation
2. Implement `registerAsset()` method:
   - Hash file content
   - Create integrity proof
   - Generate signature (if private key provided)
   - Call registration API
3. Implement `commitUpdate()` method:
   - Call update API with new metadata
4. Implement `getAssetTree()` method:
   - Fetch commit history
   - Call merge AssetTrees API
   - Return unified asset tree

### Phase 5: Documentation & Export
1. Export public API from index.ts
2. Add JSDoc comments for all public methods
3. Write README with usage examples

## Dependencies

```json
{
  "dependencies": {
    "ethers": "^6.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0"
  }
}
```

## Usage Example

```typescript
import { CaptureClient } from 'capture-sdk'
import { readFileSync } from 'fs'

const client = new CaptureClient({
  captureToken: 'YOUR_CAPTURE_TOKEN',
  privateKey: 'YOUR_PRIVATE_KEY'  // Optional
})

// Register a new asset
const asset = await client.registerAsset({
  file: readFileSync('./image.jpg'),
  filename: 'image.jpg',
  caption: 'My first registered asset',
  headline: 'Demo Asset'
})
console.log('Asset registered:', asset.id)

// Update asset metadata
const updated = await client.commitUpdate(asset.id, {
  caption: 'Updated caption',
  commitMessage: 'Updated the caption'
})

// Get merged asset tree
const assetTree = await client.getAssetTree(asset.id)
console.log('Asset tree:', assetTree)
```

## Error Handling

The SDK will throw typed errors for:
- `AuthenticationError`: Invalid or missing capture token (401)
- `PermissionError`: Insufficient permissions (403)
- `NotFoundError`: Asset not found (404)
- `InsufficientFundsError`: Not enough NUM tokens (400)
- `ValidationError`: Invalid input parameters
- `NetworkError`: Network/connection issues

## Security Considerations

1. **Private Key Handling**: Never log or expose private keys
2. **Input Validation**: Validate all user inputs before API calls
3. **HTTPS Only**: All API calls use HTTPS
4. **Token Storage**: Users responsible for secure token storage

## Design Decisions

Based on the goal of providing **compact and fluent UX**:

| Question | Decision | Rationale |
|----------|----------|-----------|
| **Environment** | Node.js + Browser | User requirement |
| **Signing** | Optional | Reduces friction; users can register without managing keys |
| **File Input** | Multiple types accepted | SDK handles conversion internally for maximum convenience |
| **Error Handling** | Throw exceptions | More fluent; users use try/catch naturally |
| **Logging** | None built-in | Keep SDK compact; users handle logging externally |
| **Retry Logic** | No auto-retry | Keep behavior predictable; users implement if needed |

## Revised Architecture (Compact)

Simplified structure for minimal footprint:

```
capture-sdk/
├── src/
│   ├── index.ts          # Entry point + exports
│   ├── client.ts         # CaptureClient class
│   ├── types.ts          # Type definitions
│   ├── crypto.ts         # Hash + signature (combined)
│   └── errors.ts         # Error classes
├── package.json
├── tsconfig.json
└── README.md
```

## Fluent API Design

```typescript
import { Capture } from 'capture-sdk'

const capture = new Capture({ token: 'YOUR_TOKEN' })

// ============================================
// SIMPLE FILE INPUT - Users provide what they have
// ============================================

// Node.js: Just pass a file path (simplest!)
const asset = await capture.register('./photo.jpg')

// Node.js: Buffer works too
const asset = await capture.register(fs.readFileSync('./photo.jpg'), { filename: 'photo.jpg' })

// Browser: File from <input type="file">
const asset = await capture.register(inputElement.files[0])

// Browser: Blob works too
const asset = await capture.register(blob, { filename: 'photo.jpg' })

// Universal: Uint8Array
const asset = await capture.register(uint8Array, { filename: 'photo.jpg' })

// With metadata
const asset = await capture.register('./photo.jpg', {
  caption: 'My photo',
  headline: 'Demo'
})

// With optional signing
const asset = await capture.register('./photo.jpg', {
  caption: 'My photo',
  sign: { privateKey: '0x...' }
})

// Update asset
await capture.update(asset.nid, { caption: 'New caption' })

// Get asset tree
const tree = await capture.getAssetTree(asset.nid)
```

## Final Public API

```typescript
// Flexible input type - SDK handles all conversions internally
type FileInput =
  | string           // File path (Node.js only)
  | File             // Browser File object
  | Blob             // Browser Blob
  | Buffer           // Node.js Buffer
  | Uint8Array       // Universal binary data

class Capture {
  constructor(options: { token: string; testnet?: boolean })

  // Core methods (3 required features)
  register(file: FileInput, options?: RegisterOptions): Promise<Asset>
  update(nid: string, options: UpdateOptions): Promise<Asset>
  getAssetTree(nid: string): Promise<AssetTree>

  // Convenience methods
  get(nid: string): Promise<Asset>
  getHistory(nid: string): Promise<Commit[]>
}

interface RegisterOptions {
  filename?: string              // Required if file is Buffer/Uint8Array/Blob
  caption?: string
  headline?: string
  sign?: { privateKey: string }
}

interface UpdateOptions {
  caption?: string
  headline?: string
  customMetadata?: Record<string, unknown>
}
```

## Implementation Phases

### Phase 1: Project Setup
- Initialize package.json with ESM + CJS dual output
- Configure TypeScript for both Node.js and browser
- Single dependency: `ethers` (for signing only when needed)

### Phase 2: Core Implementation
1. `types.ts` - All interfaces
2. `errors.ts` - CaptureError base + specific errors
3. `crypto.ts` - SHA-256 (Web Crypto API) + EIP-191 signing
4. `client.ts` - Capture class with all methods

### Phase 3: Build & Export
- Configure dual ESM/CJS output
- Export from `index.ts`

## Browser/Node.js Compatibility Strategy

| Feature | Implementation |
|---------|---------------|
| SHA-256 | Web Crypto API (`crypto.subtle`) - works in both |
| HTTP | `fetch` API - native in both modern Node.js and browsers |
| FormData | Native `FormData` - works in both |
| Signing | `ethers` - isomorphic library |
| File path read | Dynamic import `fs` (Node.js only, tree-shaken in browser) |

No polyfills needed for Node.js 18+ and modern browsers.

## File Input Handling (Internal)

The SDK automatically detects and converts input types:

```typescript
// Internal conversion logic
async function normalizeFile(input: FileInput, options?: RegisterOptions): Promise<{ data: Uint8Array; filename: string; mimeType: string }> {
  // 1. string → read file from path (Node.js)
  if (typeof input === 'string') {
    const fs = await import('fs/promises')
    const path = await import('path')
    const data = await fs.readFile(input)
    const filename = path.basename(input)
    const mimeType = getMimeType(filename)
    return { data: new Uint8Array(data), filename, mimeType }
  }

  // 2. File → extract name, type, and read ArrayBuffer (Browser)
  if (input instanceof File) {
    const data = new Uint8Array(await input.arrayBuffer())
    return { data, filename: input.name, mimeType: input.type }
  }

  // 3. Blob → read ArrayBuffer, require filename
  if (input instanceof Blob) {
    if (!options?.filename) throw new ValidationError('filename required for Blob input')
    const data = new Uint8Array(await input.arrayBuffer())
    return { data, filename: options.filename, mimeType: input.type || getMimeType(options.filename) }
  }

  // 4. Buffer/Uint8Array → require filename
  if (!options?.filename) throw new ValidationError('filename required for binary input')
  const data = input instanceof Uint8Array ? input : new Uint8Array(input)
  return { data, filename: options.filename, mimeType: getMimeType(options.filename) }
}
```

MIME type detection uses filename extension mapping (no external dependency).
