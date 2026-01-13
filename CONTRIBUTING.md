# Contributing to Capture SDK

This repository contains both TypeScript and Python implementations of the Numbers Protocol Capture SDK. This guide explains how to maintain feature parity and version consistency across both languages.

## Repository Structure

```
capture-sdk/
├── ts/                    # TypeScript SDK
│   ├── src/
│   │   ├── index.ts       # Public exports
│   │   ├── client.ts      # Capture class
│   │   ├── types.ts       # Type definitions
│   │   ├── errors.ts      # Error classes
│   │   └── crypto.ts      # Cryptographic utilities
│   ├── package.json
│   └── README.md
├── python/                # Python SDK
│   ├── capture_sdk/
│   │   ├── __init__.py    # Public exports
│   │   ├── client.py      # Capture class
│   │   ├── types.py       # Type definitions
│   │   ├── errors.py      # Error classes
│   │   └── crypto.py      # Cryptographic utilities
│   ├── tests/
│   ├── pyproject.toml
│   └── README.md
├── scripts/               # Maintenance scripts
│   ├── sync-versions.py   # Version synchronization
│   └── check-feature-parity.py  # Feature parity checker
├── .github/workflows/     # CI/CD
│   ├── ci.yml             # Test & lint
│   └── release.yml        # Publish to npm/PyPI
└── docs/
    └── PLAN.md            # Implementation plan
```

## Dual-Language Maintenance Guidelines

### 1. Version Synchronization

Both SDKs MUST maintain the same version number. Use the sync script:

```bash
# Check current versions
python scripts/sync-versions.py --check

# Bump version for both SDKs
python scripts/sync-versions.py --bump patch  # 0.1.0 -> 0.1.1
python scripts/sync-versions.py --bump minor  # 0.1.0 -> 0.2.0
python scripts/sync-versions.py --bump major  # 0.1.0 -> 1.0.0

# Set specific version
python scripts/sync-versions.py --set 1.0.0
```

### 2. Feature Parity

When adding new features, implement in BOTH languages:

```bash
# Check feature parity
python scripts/check-feature-parity.py
```

#### Checklist for New Features

- [ ] TypeScript implementation in `ts/src/`
- [ ] Python implementation in `python/capture_sdk/`
- [ ] TypeScript types in `ts/src/types.ts`
- [ ] Python types in `python/capture_sdk/types.py`
- [ ] Export in `ts/src/index.ts`
- [ ] Export in `python/capture_sdk/__init__.py`
- [ ] Update both README files
- [ ] Add tests for both implementations
- [ ] Run feature parity check

### 3. Naming Conventions

| Concept | TypeScript | Python |
|---------|------------|--------|
| Class methods | `camelCase` | `snake_case` |
| Types/Classes | `PascalCase` | `PascalCase` |
| Options fields | `camelCase` | `snake_case` |
| Constants | `UPPER_CASE` | `UPPER_CASE` |

Example:
```typescript
// TypeScript
capture.getHistory(nid)
interface RegisterOptions { publicAccess: boolean }
```

```python
# Python
capture.get_history(nid)
@dataclass
class RegisterOptions:
    public_access: bool
```

### 4. API Response Mapping

Both SDKs must map API responses consistently:

| API Field | TypeScript | Python |
|-----------|------------|--------|
| `asset_file_name` | `filename` | `filename` |
| `asset_file_mime_type` | `mimeType` | `mime_type` |
| `assetTreeCid` | `assetTreeCid` | `asset_tree_cid` |
| `timestampCreated` | `timestamp` | `timestamp` |

### 5. Error Handling

Both SDKs must have equivalent error classes:

| Error | TypeScript | Python |
|-------|------------|--------|
| Base error | `CaptureError` | `CaptureError` |
| Auth failure | `AuthenticationError` | `AuthenticationError` |
| No permission | `PermissionError` | `PermissionError` |
| Not found | `NotFoundError` | `NotFoundError` |
| No funds | `InsufficientFundsError` | `InsufficientFundsError` |
| Invalid input | `ValidationError` | `ValidationError` |
| Network issue | `NetworkError` | `NetworkError` |

## Development Workflow

### Adding a New Feature

1. **Create an Issue**: Describe the feature and its API design
2. **Update Implementation Plan**: Add to `docs/PLAN.md`
3. **Implement TypeScript**: Add to `ts/src/`
4. **Implement Python**: Add to `python/capture_sdk/`
5. **Add Tests**: Both `ts/tests/` and `python/tests/`
6. **Update README**: Both `ts/README.md` and `python/README.md`
7. **Check Parity**: `python scripts/check-feature-parity.py`
8. **Create PR**: Include both implementations

### Fixing a Bug

1. **Identify**: Determine if bug affects one or both SDKs
2. **Fix Both**: If logic bug, fix in both implementations
3. **Add Tests**: Prevent regression in both SDKs
4. **Bump Patch**: `python scripts/sync-versions.py --bump patch`

### Releasing

1. **Ensure Parity**: `python scripts/check-feature-parity.py`
2. **Sync Versions**: `python scripts/sync-versions.py --check`
3. **Create Release**: Push tag `v{version}` (e.g., `v0.2.0`)
4. **CI Publishes**: GitHub Actions publishes to npm and PyPI

## Testing

### TypeScript
```bash
cd ts
npm install
npm run build
npm run typecheck
npm test  # When tests are added
```

### Python
```bash
cd python
pip install -e ".[dev]"
pytest
ruff check .
mypy capture_sdk
```

## Pull Request Requirements

- [ ] Changes implemented in both languages (if applicable)
- [ ] Tests added/updated for both SDKs
- [ ] Documentation updated in both READMEs
- [ ] Feature parity check passes
- [ ] Version sync check passes
- [ ] CI passes (build, lint, test)

## Questions?

Open an issue on GitHub for any questions about maintaining this dual-language SDK.
