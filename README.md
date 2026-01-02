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

## API

| Method | Description |
|--------|-------------|
| `register(file, options?)` | Register a new asset |
| `update(nid, options)` | Update asset metadata |
| `getAssetTree(nid)` | Get merged provenance tree |
| `get(nid)` | Get asset info |
| `getHistory(nid)` | Get commit history |

## Requirements

- Node.js 18+ or modern browser
- [Capture Token](https://docs.captureapp.xyz/)

## License

MIT
