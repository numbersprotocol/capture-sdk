/**
 * URL helpers for Numbers Protocol Verify Engine.
 *
 * Verify Engine provides a web interface for searching and viewing
 * digital asset provenance.
 */

const VERIFY_BASE_URL = 'https://verify.numbersprotocol.io'

/**
 * Generates URLs for the Numbers Protocol Verify Engine web interface.
 */
export const VerifyUrls = {
  /**
   * Generates a search URL for finding an asset by its NID.
   *
   * @param nid - Numbers ID of the asset
   * @returns URL to the Verify Engine search page
   *
   * @example
   * ```typescript
   * const url = VerifyUrls.searchByNid('bafybei...')
   * // => 'https://verify.numbersprotocol.io/search?nid=bafybei...'
   * ```
   */
  searchByNid(nid: string): string {
    return `${VERIFY_BASE_URL}/search?nid=${encodeURIComponent(nid)}`
  },

  /**
   * Generates a search URL for finding an asset by its NFT information.
   *
   * @param tokenId - NFT token ID
   * @param contract - Smart contract address
   * @returns URL to the Verify Engine search page
   *
   * @example
   * ```typescript
   * const url = VerifyUrls.searchByNft('123', '0x1234...')
   * // => 'https://verify.numbersprotocol.io/search?nft=123&contract=0x1234...'
   * ```
   */
  searchByNft(tokenId: string, contract: string): string {
    const params = new URLSearchParams({
      nft: tokenId,
      contract: contract,
    })
    return `${VERIFY_BASE_URL}/search?${params.toString()}`
  },

  /**
   * Generates a URL to view an asset's profile page by its NID.
   *
   * @param nid - Numbers ID of the asset
   * @returns URL to the asset profile page
   *
   * @example
   * ```typescript
   * const url = VerifyUrls.assetProfile('bafybei...')
   * // => 'https://verify.numbersprotocol.io/asset-profile?nid=bafybei...'
   * ```
   */
  assetProfile(nid: string): string {
    return `${VERIFY_BASE_URL}/asset-profile?nid=${encodeURIComponent(nid)}`
  },

  /**
   * Generates a URL to view an asset's profile page by its NFT information.
   *
   * @param tokenId - NFT token ID
   * @param contract - Smart contract address
   * @returns URL to the asset profile page
   *
   * @example
   * ```typescript
   * const url = VerifyUrls.assetProfileByNft('123', '0x1234...')
   * // => 'https://verify.numbersprotocol.io/asset-profile?nft=123&contract=0x1234...'
   * ```
   */
  assetProfileByNft(tokenId: string, contract: string): string {
    const params = new URLSearchParams({
      nft: tokenId,
      contract: contract,
    })
    return `${VERIFY_BASE_URL}/asset-profile?${params.toString()}`
  },
}
