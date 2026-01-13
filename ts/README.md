# Capture SDK (TypeScript)

TypeScript SDK for the [Numbers Protocol](https://numbersprotocol.io/) Capture API. Register and manage digital assets with blockchain-backed provenance.

## Installation

```bash
npm install @numbersprotocol/capture-sdk
```

## Quick Start

```typescript
import { Capture } from '@numbersprotocol/capture-sdk'

// Initialize client
const capture = new Capture({ token: 'your-api-token' })

// Register an asset
const asset = await capture.register('./photo.jpg', { caption: 'My photo' })
console.log('Registered:', asset.nid)

// Retrieve asset
const retrieved = await capture.get(asset.nid)
console.log('Filename:', retrieved.filename)

// Update metadata
const updated = await capture.update(asset.nid, {
  caption: 'Updated caption',
  commitMessage: 'Fixed typo',
})

// Get commit history
const history = await capture.getHistory(asset.nid)
for (const commit of history) {
  console.log('Action:', commit.action, 'Author:', commit.author)
}

// Get merged provenance data
const tree = await capture.getAssetTree(asset.nid)
console.log('Creator:', tree.creatorName)
```

## File Input Types

The SDK accepts multiple file input formats:

```typescript
// Node.js: File path
const asset = await capture.register('./photo.jpg')

// Browser: File input
const asset = await capture.register(fileInput.files[0])

// Browser: Blob
const asset = await capture.register(blob, { filename: 'photo.jpg' })

// Universal: Uint8Array
const asset = await capture.register(uint8Array, { filename: 'photo.jpg' })
```

## Optional Signing

For cryptographic signing of assets using EIP-191:

```typescript
const asset = await capture.register('./photo.jpg', {
  sign: { privateKey: '0x...your-private-key' },
})
```

## API Reference

### `new Capture(options)`

| Option | Type | Description |
|--------|------|-------------|
| `token` | `string` | API authentication token (required) |
| `testnet` | `boolean` | Use testnet (default: false) |
| `baseUrl` | `string` | Custom API URL |

### `capture.register(file, options?)`

| Option | Type | Description |
|--------|------|-------------|
| `filename` | `string` | Required for binary input |
| `caption` | `string` | Asset description |
| `headline` | `string` | Title (max 25 chars) |
| `publicAccess` | `boolean` | IPFS pinning (default: true) |
| `sign` | `{ privateKey: string }` | Signing configuration |

### `capture.update(nid, options)`

| Option | Type | Description |
|--------|------|-------------|
| `caption` | `string` | Updated description |
| `headline` | `string` | Updated title |
| `commitMessage` | `string` | Change description |
| `customMetadata` | `object` | Custom fields |

### `capture.get(nid)`

Retrieve a single asset by NID.

### `capture.getHistory(nid)`

Get commit history of an asset.

### `capture.getAssetTree(nid)`

Get merged provenance data.

## Error Handling

```typescript
import {
  CaptureError,
  AuthenticationError,
  NotFoundError,
  ValidationError,
} from '@numbersprotocol/capture-sdk'

try {
  await capture.get('invalid-nid')
} catch (error) {
  if (error instanceof NotFoundError) {
    console.log('Asset not found')
  } else if (error instanceof AuthenticationError) {
    console.log('Auth failed')
  } else if (error instanceof CaptureError) {
    console.log('Error:', error.code, error.message)
  }
}
```

## Requirements

- Node.js 18+ or modern browser with Web Crypto API

## License

MIT
