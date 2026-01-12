# Capture SDK

TypeScript SDK for [Numbers Protocol](https://numbersprotocol.io/) Capture API. Register digital assets, commit updates, and retrieve provenance data.

## Install

```bash
npm install capture-sdk
```

## Usage

```typescript
import { Capture } from 'capture-sdk'

const capture = new Capture({ token: 'YOUR_CAPTURE_TOKEN' })

// Register an asset
const asset = await capture.register('./photo.jpg')
// Or with options:
// await capture.register('./photo.jpg', { caption: 'My photo', headline: 'Demo' })

// Update metadata
await capture.update(asset.nid, { caption: 'Updated caption' })

// Get provenance tree
const tree = await capture.getAssetTree(asset.nid)

// Verify asset for theft detection
const result = await capture.verify('./photo.jpg')
if (result.similarAssets.length > 0 || result.nftMatches.length > 0) {
  console.log('Potential matches found!')
}
```

### File Input

```typescript
// Node.js - file path
await capture.register('./photo.jpg')

// Node.js - Buffer
await capture.register(buffer, { filename: 'photo.jpg' })

// Browser - File input
await capture.register(fileInput.files[0])

// Browser - Blob
await capture.register(blob, { filename: 'photo.jpg' })
```

### With Signing (Optional)

```typescript
await capture.register('./photo.jpg', {
  sign: { privateKey: '0x...' }
})
```

### Asset Verification (Theft Detection)

Use the [Verify Engine](https://docs.numbersprotocol.io/applications/verify-engine/) to detect similar assets and cross-chain NFT matches.

```typescript
// Verify a local file
const result = await capture.verify('./photo.jpg')

// Verify by URL
const result = await capture.verify({ url: 'https://example.com/image.jpg' })

// With options
const result = await capture.verify('./photo.jpg', {
  threshold: 0.1,  // Lower = stricter matching (default: 0.12)
  excludedAssets: ['bafybei...'],  // NIDs to exclude
  excludedContracts: ['0x...']  // Contract addresses to exclude
})

// Check results
console.log('Similar assets:', result.similarAssets)
console.log('NFT matches:', result.nftMatches)
console.log('Search NID:', result.searchNid)
```

**Note:** Each verification call costs 1 NUM + gas (~0.004 NUM).

## API

| Method | Description |
|--------|-------------|
| `register(file, options?)` | Register a new asset |
| `update(nid, options)` | Update asset metadata |
| `getAssetTree(nid)` | Get merged provenance tree |
| `get(nid)` | Get asset info |
| `getHistory(nid)` | Get commit history |
| `verify(input, options?)` | Verify asset for theft detection |

## Requirements

- Node.js 18+ or modern browser
- [Capture Token](https://docs.captureapp.xyz/)

## License

MIT
