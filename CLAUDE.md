# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Multi-language monorepo containing TypeScript and Python SDKs for the Numbers Protocol Capture API. Both SDKs must maintain feature parity and version synchronization.

## Build & Test Commands

### TypeScript (ts/)
```bash
cd ts
npm install
npm run build        # Build ESM + CJS to dist/
npm run typecheck    # Type check with tsc
npm run dev          # Watch mode
npm test             # Run tests
```

### Python (python/)
```bash
cd python
pip install -e ".[dev]"    # Install with dev dependencies
pytest -v                  # Run tests with verbose output
pytest --cov=numbersprotocol_capture   # Run tests with coverage
ruff check .               # Lint
mypy numbersprotocol_capture           # Type check
```

## Version Management

Both SDKs must have identical versions. Always use the sync script:
```bash
python scripts/sync-versions.py --check           # Verify versions match
python scripts/sync-versions.py --bump patch      # 0.1.0 -> 0.1.1
python scripts/sync-versions.py --bump minor      # 0.1.0 -> 0.2.0
python scripts/check-feature-parity.py            # Verify feature parity
```

## Architecture

```
ts/src/                     python/numbersprotocol_capture/
├── index.ts (exports)      ├── __init__.py (exports)
├── client.ts (Capture)     ├── client.py (Capture)
├── types.ts                ├── types.py
├── errors.ts               └── errors.py
└── crypto.ts               └── crypto.py
```

Both SDKs expose the same API with language-appropriate naming:
- `register(file, options)` - Register digital asset
- `update(nid, options)` - Update asset metadata
- `get(nid)` - Get asset details
- `getHistory(nid)` / `get_history(nid)` - Get commit history
- `getAssetTree(nid)` / `get_asset_tree(nid)` - Get provenance tree

## Naming Conventions

| TypeScript | Python |
|------------|--------|
| `camelCase` methods | `snake_case` methods |
| `PascalCase` types | `PascalCase` classes |
| `publicAccess` | `public_access` |

## Key Constraints

1. **Dual implementation required**: New features must be implemented in both languages
2. **CI validates parity**: Feature parity and version sync are checked on every PR
3. **Release via tags**: Push `v*` tag to trigger npm and PyPI publish

## Package Names

| Platform | Package Name | Import |
|----------|--------------|--------|
| npm | `@numbersprotocol/capture-sdk` | `import { Capture } from '@numbersprotocol/capture-sdk'` |
| PyPI | `numbersprotocol-capture-sdk` | `from numbersprotocol_capture import Capture` |

## Release Process

Releases are triggered by pushing a `v*` tag:

```bash
# Bump version in both SDKs
python scripts/sync-versions.py --bump patch   # or minor/major

# Commit the version changes
git add -A && git commit -m "chore: bump version to x.y.z"

# Create and push tag
git tag v0.2.1
git push origin main --tags
```

CI automatically publishes to npm and PyPI when the tag is pushed.
