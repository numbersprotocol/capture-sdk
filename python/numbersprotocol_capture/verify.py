"""
URL helpers for Numbers Protocol Verify Engine.

Verify Engine provides a web interface for searching and viewing
digital asset provenance.
"""

from urllib.parse import urlencode

VERIFY_BASE_URL = "https://verify.numbersprotocol.io"


def search_by_nid(nid: str) -> str:
    """
    Generates a search URL for finding an asset by its NID.

    Args:
        nid: Numbers ID of the asset.

    Returns:
        URL to the Verify Engine search page.

    Example:
        >>> url = search_by_nid("bafybei...")
        >>> # => "https://verify.numbersprotocol.io/search?nid=bafybei..."
    """
    return f"{VERIFY_BASE_URL}/search?nid={nid}"


def search_by_nft(token_id: str, contract: str) -> str:
    """
    Generates a search URL for finding an asset by its NFT information.

    Args:
        token_id: NFT token ID.
        contract: Smart contract address.

    Returns:
        URL to the Verify Engine search page.

    Example:
        >>> url = search_by_nft("123", "0x1234...")
        >>> # => "https://verify.numbersprotocol.io/search?nft=123&contract=0x1234..."
    """
    params = urlencode({"nft": token_id, "contract": contract})
    return f"{VERIFY_BASE_URL}/search?{params}"


def asset_profile(nid: str) -> str:
    """
    Generates a URL to view an asset's profile page by its NID.

    Args:
        nid: Numbers ID of the asset.

    Returns:
        URL to the asset profile page.

    Example:
        >>> url = asset_profile("bafybei...")
        >>> # => "https://verify.numbersprotocol.io/asset-profile?nid=bafybei..."
    """
    return f"{VERIFY_BASE_URL}/asset-profile?nid={nid}"


def asset_profile_by_nft(token_id: str, contract: str) -> str:
    """
    Generates a URL to view an asset's profile page by its NFT information.

    Args:
        token_id: NFT token ID.
        contract: Smart contract address.

    Returns:
        URL to the asset profile page.

    Example:
        >>> url = asset_profile_by_nft("123", "0x1234...")
        >>> # => "https://verify.numbersprotocol.io/asset-profile?nft=123&contract=0x1234..."
    """
    params = urlencode({"nft": token_id, "contract": contract})
    return f"{VERIFY_BASE_URL}/asset-profile?{params}"
