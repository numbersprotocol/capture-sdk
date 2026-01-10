#!/usr/bin/env npx tsx

/**
 * Capture SDK Example
 *
 * Usage:
 *   export CAPTURE_TOKEN=your_token_here
 *   npx tsx example.ts ./test-image.jpg
 */

import { Capture } from './src/index.js'

const TOKEN = process.env.CAPTURE_TOKEN
const FILE = process.argv[2]

if (!TOKEN) {
  console.error('Error: CAPTURE_TOKEN environment variable is required')
  process.exit(1)
}

if (!FILE) {
  console.error('Usage: npx tsx example.ts <image-file>')
  process.exit(1)
}

async function main() {
  const capture = new Capture({ token: TOKEN })

  // 1. Register an asset
  console.log(`Registering ${FILE}...`)
  const asset = await capture.register(FILE, {
    caption: 'Test image',
    headline: 'Demo',
  })
  console.log('Registered:', asset.nid)

  // 2. Update metadata
  console.log('Updating metadata...')
  const updated = await capture.update(asset.nid, {
    caption: 'Updated caption',
    commitMessage: 'Changed caption',
  })
  console.log('Updated:', updated.caption)

  // 3. Get asset tree
  console.log('Getting asset tree...')
  const tree = await capture.getAssetTree(asset.nid)
  console.log('Asset tree:', JSON.stringify(tree, null, 2))
}

main().catch(console.error)
