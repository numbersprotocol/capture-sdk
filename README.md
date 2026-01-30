# Capture SDK

Official SDKs for [Numbers Protocol](https://numbersprotocol.io/) Capture API. Register digital assets with blockchain-backed provenance.

**Available in two languages:**
- [TypeScript/JavaScript](./ts/) - For Node.js and browser
- [Python](./python/) - For Python 3.13+

## Installation

### TypeScript/JavaScript
```bash
npm install @numbersprotocol/capture-sdk
```

### Python
```bash
pip install numbersprotocol-capture-sdk
```

## Quick Start

### TypeScript
```typescript
import { Capture } from '@numbersprotocol/capture-sdk'

const capture = new Capture({ token: 'YOUR_TOKEN' })

// Register an asset
const asset = await capture.register('./photo.jpg', { caption: 'My photo' })

// Get provenance data
const tree = await capture.getAssetTree(asset.nid)
```

### Python
```python
from numbersprotocol_capture import Capture

capture = Capture(token='YOUR_TOKEN')

# Register an asset
asset = capture.register('./photo.jpg', caption='My photo')

# Get provenance data
tree = capture.get_asset_tree(asset.nid)
```

## API Overview

| Method | TypeScript | Python |
|--------|------------|--------|
| Register asset | `register(file, options?)` | `register(file, **options)` |
| Update metadata | `update(nid, options)` | `update(nid, **options)` |
| Get asset | `get(nid)` | `get(nid)` |
| Get history | `getHistory(nid)` | `get_history(nid)` |
| Get provenance | `getAssetTree(nid)` | `get_asset_tree(nid)` |

## Documentation

- [TypeScript SDK](./ts/README.md) - Full API reference and examples
- [Python SDK](./python/README.md) - Full API reference and examples
- [Contributing Guide](./CONTRIBUTING.md) - How to contribute and maintain both SDKs

## Requirements

- **TypeScript**: Node.js 18+ or modern browser
- **Python**: Python 3.13+
- **API Token**: Get from [Capture Dashboard](https://docs.captureapp.xyz/)

## Repository Structure

```
capture-sdk/
├── ts/                    # TypeScript SDK
│   ├── src/               # Source code
│   ├── package.json       # npm package config
│   └── README.md
├── python/                # Python SDK
│   ├── numbersprotocol_capture/  # Source code
│   ├── pyproject.toml     # PyPI package config
│   └── README.md
├── scripts/               # Maintenance tools
│   ├── sync-versions.py   # Version sync tool
│   └── check-feature-parity.py
└── .github/workflows/     # CI/CD
    ├── ci.yml             # Test & lint
    └── release.yml        # Publish to npm/PyPI
```

## Version Synchronization

Both SDKs maintain the same version number. To release:

```bash
# Bump version in both SDKs
python scripts/sync-versions.py --bump minor

# Create and push tag
git tag v0.2.0
git push origin v0.2.0
```

CI automatically publishes to npm and PyPI when a tag is pushed.

## License

MIT
