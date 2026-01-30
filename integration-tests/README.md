# Capture SDK Integration Tests

Integration tests for the published Capture SDK packages to verify they work correctly after release.

## Prerequisites

You need a valid Numbers Protocol Capture API token. Get one from:
https://captureapp.xyz/

Set the token as an environment variable:
```bash
export CAPTURE_TOKEN=your_token_here
```

## TypeScript Test

Tests the npm package `@numbersprotocol/capture-sdk@0.2.0`.

### Setup
```bash
cd integration-tests
npm install
```

### Run
```bash
npm run test:ts
```

Or directly:
```bash
npx tsx test-published-sdk.ts
```

## Python Test

Tests the PyPI package `numbersprotocol-capture-sdk==0.2.0`.

### Setup
```bash
cd integration-tests
pip install -r requirements.txt
```

### Run
```bash
python test_published_sdk.py
```

Or using npm script:
```bash
npm run test:py
```

## What the Tests Do

Both tests perform the same workflow:

1. **Generate Test Image** - Creates a PNG image with the current timestamp
2. **Register Image** - Uploads and registers the image with Numbers Protocol
3. **Update Metadata** - Updates the asset's headline metadata
4. **Verify Engine Search** - Searches for the asset using the verify engine
5. **Get Asset Tree** - Retrieves the provenance data for the asset

## Expected Output

```
Capture SDK v0.2.0 - Published Package Integration Test
Timestamp: 2026-01-30T12:00:00.000Z

============================================================
Step 1: Generate Test Image
============================================================
Generating image: test-image-1738234800.png
Image size: 1234 bytes
[OK] Test image generated successfully

============================================================
Step 2: Register Image
============================================================
Registering image with Numbers Protocol...
  Filename: test-image-1738234800.png
  Caption: Integration test image generated at 2026-01-30T12:00:00.000Z

Registration successful!
  NID: bafybei...
  Filename: test-image-1738234800.png
  MIME Type: image/png
  Caption: Integration test image generated at 2026-01-30T12:00:00.000Z
[OK] Image registered successfully

...

============================================================
Test Summary
============================================================
All integration tests passed!

Results:
  - Image generated: test-image-1738234800.png
  - Asset registered: bafybei...
  - Headline updated: SDK Test v0.2.0
  - Verify engine: Working

View asset: https://verify.numbersprotocol.io/asset-profile/bafybei...

[OK] Integration test completed successfully
```

## Troubleshooting

### "CAPTURE_TOKEN environment variable is required"
Make sure you've set the environment variable:
```bash
export CAPTURE_TOKEN=your_token_here
```

### "Asset not yet indexed"
This is expected for newly registered assets. The verify engine takes some time to index new assets.

### Network errors
Check your internet connection and that the Numbers Protocol API is accessible.
