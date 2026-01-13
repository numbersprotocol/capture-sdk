# Capture SDK (Python)

Python SDK for the [Numbers Protocol](https://numbersprotocol.io/) Capture API. Register and manage digital assets with blockchain-backed provenance.

## Installation

```bash
pip install capture-sdk
```

## Quick Start

```python
from capture_sdk import Capture

# Initialize client
capture = Capture(token="your-api-token")

# Register an asset
asset = capture.register("./photo.jpg", caption="My photo")
print(f"Registered: {asset.nid}")

# Retrieve asset
asset = capture.get(asset.nid)
print(f"Filename: {asset.filename}")

# Update metadata
updated = capture.update(
    asset.nid,
    caption="Updated caption",
    commit_message="Fixed typo"
)

# Get commit history
history = capture.get_history(asset.nid)
for commit in history:
    print(f"Action: {commit.action}, Author: {commit.author}")

# Get merged provenance data
tree = capture.get_asset_tree(asset.nid)
print(f"Creator: {tree.creator_name}")
```

## File Input Types

The SDK accepts multiple file input formats:

```python
# File path (string)
asset = capture.register("./photo.jpg")

# pathlib.Path
from pathlib import Path
asset = capture.register(Path("./photo.jpg"))

# Binary data (requires filename)
with open("photo.jpg", "rb") as f:
    data = f.read()
asset = capture.register(data, filename="photo.jpg")
```

## Optional Signing

For cryptographic signing of assets using EIP-191:

```python
asset = capture.register(
    "./photo.jpg",
    sign={"private_key": "0x...your-private-key"}
)
```

## Context Manager

Use as a context manager for automatic resource cleanup:

```python
with Capture(token="your-token") as capture:
    asset = capture.register("./photo.jpg")
```

## API Reference

### `Capture(token, testnet=False, base_url=None)`

Initialize the client.

| Parameter | Type | Description |
|-----------|------|-------------|
| `token` | `str` | API authentication token |
| `testnet` | `bool` | Use testnet (default: False) |
| `base_url` | `str` | Custom API URL |

### `capture.register(file, **options)`

Register a new asset.

| Parameter | Type | Description |
|-----------|------|-------------|
| `file` | `FileInput` | File path, Path, or bytes |
| `filename` | `str` | Required for binary input |
| `caption` | `str` | Asset description |
| `headline` | `str` | Title (max 25 chars) |
| `public_access` | `bool` | IPFS pinning (default: True) |
| `sign` | `dict` | `{"private_key": "0x..."}` |

### `capture.update(nid, **options)`

Update asset metadata.

| Parameter | Type | Description |
|-----------|------|-------------|
| `nid` | `str` | Numbers ID |
| `caption` | `str` | Updated description |
| `headline` | `str` | Updated title |
| `commit_message` | `str` | Change description |
| `custom_metadata` | `dict` | Custom fields |

### `capture.get(nid)`

Retrieve a single asset by NID.

### `capture.get_history(nid)`

Get commit history of an asset.

### `capture.get_asset_tree(nid)`

Get merged provenance data.

## Error Handling

```python
from capture_sdk import (
    CaptureError,
    AuthenticationError,
    NotFoundError,
    ValidationError,
)

try:
    asset = capture.get("invalid-nid")
except NotFoundError as e:
    print(f"Asset not found: {e}")
except AuthenticationError as e:
    print(f"Auth failed: {e}")
except CaptureError as e:
    print(f"Error: {e.code} - {e.message}")
```

## Requirements

- Python 3.10+

## License

MIT
