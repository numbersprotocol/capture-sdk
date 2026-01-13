#!/usr/bin/env python3
"""
Capture SDK Example - Demonstrates all SDK features.

Usage:
    CAPTURE_TOKEN=your-token python example.py ./image.jpg

Or with signing:
    CAPTURE_TOKEN=your-token PRIVATE_KEY=0x... python example.py ./image.jpg
"""

import os
import sys
from datetime import datetime

from capture_sdk import Capture, NotFoundError


def main() -> None:
    # Get token from environment
    token = os.environ.get("CAPTURE_TOKEN")
    if not token:
        print("Error: CAPTURE_TOKEN environment variable is required")
        print("Usage: CAPTURE_TOKEN=your-token python example.py ./image.jpg")
        sys.exit(1)

    # Get file path from command line
    if len(sys.argv) < 2:
        print("Error: File path is required")
        print("Usage: CAPTURE_TOKEN=your-token python example.py ./image.jpg")
        sys.exit(1)

    file_path = sys.argv[1]
    private_key = os.environ.get("PRIVATE_KEY")

    # Initialize client
    with Capture(token=token) as capture:
        print("=" * 50)
        print("Capture SDK Python Example")
        print("=" * 50)

        # 1. Register asset
        print("\n1. Registering asset...")
        register_opts = {
            "caption": "Test asset from Python SDK",
            "headline": "Python Demo",
        }
        if private_key:
            register_opts["sign"] = {"private_key": private_key}
            print("   (with EIP-191 signing)")

        asset = capture.register(file_path, **register_opts)
        print(f"   NID: {asset.nid}")
        print(f"   Filename: {asset.filename}")
        print(f"   MIME Type: {asset.mime_type}")
        print(f"   Caption: {asset.caption}")
        print(f"   Headline: {asset.headline}")

        # 2. Retrieve asset
        print("\n2. Retrieving asset...")
        retrieved = capture.get(asset.nid)
        print(f"   Retrieved NID: {retrieved.nid}")
        print(f"   Filename: {retrieved.filename}")

        # 3. Update metadata
        print("\n3. Updating metadata...")
        updated = capture.update(
            asset.nid,
            caption="Updated caption from Python SDK",
            commit_message="Updated via Python example script",
        )
        print(f"   New caption: {updated.caption}")

        # 4. Get commit history
        print("\n4. Getting commit history...")
        history = capture.get_history(asset.nid)
        print(f"   Found {len(history)} commit(s)")
        for i, commit in enumerate(history):
            timestamp = datetime.fromtimestamp(commit.timestamp)
            print(f"   [{i + 1}] {commit.action}")
            print(f"       Author: {commit.author}")
            print(f"       Time: {timestamp}")
            print(f"       TX: {commit.tx_hash[:16]}...")

        # 5. Get merged asset tree
        print("\n5. Getting merged asset tree...")
        tree = capture.get_asset_tree(asset.nid)
        print(f"   Asset CID: {tree.asset_cid or 'N/A'}")
        print(f"   Creator: {tree.creator_name or 'N/A'}")
        print(f"   Caption: {tree.caption or 'N/A'}")
        if tree.created_at:
            created = datetime.fromtimestamp(tree.created_at / 1000)
            print(f"   Created: {created}")

        # 6. Demonstrate error handling
        print("\n6. Demonstrating error handling...")
        try:
            capture.get("invalid-nid-that-does-not-exist")
        except NotFoundError as e:
            print(f"   Caught expected error: {e}")

        print("\n" + "=" * 50)
        print("Example completed successfully!")
        print("=" * 50)


if __name__ == "__main__":
    main()
