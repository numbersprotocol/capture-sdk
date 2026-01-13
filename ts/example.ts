#!/usr/bin/env npx tsx

/**
 * Capture SDK Example
 *
 * This example demonstrates all available SDK functions:
 * - register: Register a new digital asset
 * - get: Retrieve asset information by NID
 * - update: Update asset metadata
 * - getHistory: Get the commit history of an asset
 * - getAssetTree: Get merged provenance data
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
  console.log(`\n=== 1. Register Asset ===`)
  console.log(`Registering ${FILE}...`)
  const asset = await capture.register(FILE, {
    caption: 'Test image',
    headline: 'Demo',
  })
  console.log('Registered asset:')
  console.log('  NID:', asset.nid)
  console.log('  Filename:', asset.filename)
  console.log('  MIME Type:', asset.mimeType)
  console.log('  Caption:', asset.caption)
  console.log('  Headline:', asset.headline)

  // 2. Get asset by NID
  console.log(`\n=== 2. Get Asset ===`)
  console.log(`Fetching asset ${asset.nid}...`)
  const fetched = await capture.get(asset.nid)
  console.log('Fetched asset:')
  console.log('  NID:', fetched.nid)
  console.log('  Filename:', fetched.filename)
  console.log('  MIME Type:', fetched.mimeType)
  console.log('  Caption:', fetched.caption)
  console.log('  Headline:', fetched.headline)

  // 3. Update metadata
  console.log(`\n=== 3. Update Metadata ===`)
  console.log('Updating metadata...')
  const updated = await capture.update(asset.nid, {
    caption: 'Updated caption',
    headline: 'Updated',
    commitMessage: 'Changed caption and headline',
  })
  console.log('Updated asset:')
  console.log('  Caption:', updated.caption)
  console.log('  Headline:', updated.headline)

  // 4. Get commit history
  console.log(`\n=== 4. Get History ===`)
  console.log('Fetching commit history...')
  const history = await capture.getHistory(asset.nid)
  console.log(`Found ${history.length} commit(s):`)
  history.forEach((commit, index) => {
    console.log(`  Commit ${index + 1}:`)
    console.log('    Asset Tree CID:', commit.assetTreeCid)
    console.log('    TX Hash:', commit.txHash)
    console.log('    Author:', commit.author)
    console.log('    Committer:', commit.committer)
    console.log('    Timestamp:', new Date(commit.timestamp * 1000).toISOString())
    console.log('    Action:', commit.action)
  })

  // 5. Get merged asset tree
  console.log(`\n=== 5. Get Asset Tree ===`)
  console.log('Fetching merged asset tree...')
  const tree = await capture.getAssetTree(asset.nid)
  console.log('Asset tree:')
  console.log('  Asset CID:', tree.assetCid)
  console.log('  Asset SHA256:', tree.assetSha256)
  console.log('  Creator:', tree.creatorName)
  console.log('  Creator Wallet:', tree.creatorWallet)
  console.log('  Created At:', tree.createdAt ? new Date(tree.createdAt * 1000).toISOString() : 'N/A')
  console.log('  Caption:', tree.caption)
  console.log('  Headline:', tree.headline)
  console.log('  MIME Type:', tree.mimeType)
  console.log('  License:', tree.license)
  console.log('\nFull tree JSON:')
  console.log(JSON.stringify(tree, null, 2))

  console.log(`\n=== Done ===`)
  console.log(`Asset NID: ${asset.nid}`)
}

main().catch(console.error)
