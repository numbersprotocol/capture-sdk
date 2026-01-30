/**
 * Integration tests for Capture SDK.
 *
 * These tests verify that the SDK correctly retrieves and parses
 * data from the Numbers Protocol API.
 *
 * Run with: npx ts-node src/integration.test.ts
 * Or set CAPTURE_TOKEN environment variable for live API tests.
 */

import { Capture } from './client.js'

// Test asset NID
const TEST_NID = 'bafybeif3mhxhkhfwuszl2lybtai3hz3q6naqpfisd4q55mcc7opkmiv5ei'

// Expected values for Test 1
const EXPECTED_CREATOR_WALLET = '0x019F590C900c78060da8597186d065ee514931BB'
const EXPECTED_NFT_RECORD = 'bafkreibjj4sgpeirznei5or3lncndzije6nw4qsksoomsbu23ivp7bdwei'

/**
 * Test 1: Verify asset tree contains correct creatorWallet and nftRecord
 */
async function testAssetTree(): Promise<boolean> {
  console.log('=== Test 1: Asset Tree Verification ===')
  console.log(`Testing NID: ${TEST_NID}`)

  const token = process.env.CAPTURE_TOKEN
  if (!token) {
    console.error('Error: CAPTURE_TOKEN environment variable is required')
    return false
  }

  const capture = new Capture({ token })

  try {
    const tree = await capture.getAssetTree(TEST_NID)

    console.log('\nAsset Tree Response:')
    console.log(`  assetCid: ${tree.assetCid}`)
    console.log(`  creatorName: ${tree.creatorName}`)
    console.log(`  creatorWallet: ${tree.creatorWallet}`)
    console.log(`  nftRecord: ${tree.nftRecord}`)
    console.log(`  mimeType: ${tree.mimeType}`)

    // Verify creatorWallet
    if (tree.creatorWallet !== EXPECTED_CREATOR_WALLET) {
      console.error(
        `\nFAILED: creatorWallet mismatch\n` +
          `  Expected: ${EXPECTED_CREATOR_WALLET}\n` +
          `  Got: ${tree.creatorWallet}`
      )
      return false
    }
    console.log('\n✓ creatorWallet matches expected value')

    // Verify nftRecord
    if (tree.nftRecord !== EXPECTED_NFT_RECORD) {
      console.error(
        `\nFAILED: nftRecord mismatch\n` +
          `  Expected: ${EXPECTED_NFT_RECORD}\n` +
          `  Got: ${tree.nftRecord}`
      )
      return false
    }
    console.log('✓ nftRecord matches expected value')

    console.log('\n=== Test 1 PASSED ===\n')
    return true
  } catch (error) {
    console.error('Test 1 failed with error:', error)
    return false
  }
}

/**
 * Test 2: Verify asset search returns correct results
 */
async function testAssetSearch(imagePath?: string): Promise<boolean> {
  console.log('=== Test 2: Verify Engine Asset Search ===')

  const token = process.env.CAPTURE_TOKEN
  if (!token) {
    console.error('Error: CAPTURE_TOKEN environment variable is required')
    return false
  }

  const capture = new Capture({ token })

  try {
    let result

    if (imagePath) {
      console.log(`Searching with file: ${imagePath}`)
      result = await capture.searchAsset({ file: imagePath })
    } else {
      console.log(`Searching with NID: ${TEST_NID}`)
      result = await capture.searchAsset({ nid: TEST_NID })
    }

    console.log('\nSearch Results:')
    console.log(`  preciseMatch: ${result.preciseMatch}`)
    console.log(`  inputFileMimeType: ${result.inputFileMimeType}`)
    console.log(`  orderId: ${result.orderId}`)
    console.log(`  similarMatches count: ${result.similarMatches.length}`)

    if (result.similarMatches.length > 0) {
      console.log('\n  Similar matches:')
      result.similarMatches.slice(0, 5).forEach((match, i) => {
        console.log(`    ${i + 1}. ${match.nid} (distance: ${match.distance})`)
      })
    }

    // If searching by file, verify the expected NID is in results
    if (imagePath) {
      // Check if precise match or similar matches contain the expected NID
      const foundExact = result.preciseMatch === TEST_NID
      const foundSimilar = result.similarMatches.some((m) => m.nid === TEST_NID)

      if (!foundExact && !foundSimilar) {
        console.error(
          `\nFAILED: Expected NID ${TEST_NID} not found in results`
        )
        return false
      }

      if (foundExact) {
        console.log(`\n✓ Found exact match: ${TEST_NID}`)
      } else {
        console.log(`\n✓ Found in similar matches: ${TEST_NID}`)
      }

      // Verify there are other similar assets
      const otherMatches = result.similarMatches.filter(
        (m) => m.nid !== TEST_NID
      )
      if (otherMatches.length === 0 && !foundExact) {
        console.warn('Warning: No other similar assets found')
      } else {
        console.log(
          `✓ Found ${otherMatches.length} other similar assets`
        )
      }
    }

    console.log('\n=== Test 2 PASSED ===\n')
    return true
  } catch (error) {
    console.error('Test 2 failed with error:', error)
    return false
  }
}

/**
 * Run all tests
 */
async function runTests(): Promise<void> {
  console.log('Capture SDK Integration Tests\n')
  console.log('==============================\n')

  const imagePath = process.argv[2] // Optional image path from command line

  const results = await Promise.all([
    testAssetTree(),
    testAssetSearch(imagePath),
  ])

  console.log('\n==============================')
  console.log('Test Summary:')
  console.log(`  Test 1 (Asset Tree): ${results[0] ? 'PASSED' : 'FAILED'}`)
  console.log(`  Test 2 (Asset Search): ${results[1] ? 'PASSED' : 'FAILED'}`)
  console.log('==============================\n')

  if (!results.every((r) => r)) {
    process.exit(1)
  }
}

// Run tests if this file is executed directly
runTests()
