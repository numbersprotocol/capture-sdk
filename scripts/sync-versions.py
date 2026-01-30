#!/usr/bin/env python3
"""
Version synchronization script for capture-sdk monorepo.

This script ensures both TypeScript and Python SDKs maintain consistent versions.

Usage:
    # Check current versions
    python scripts/sync-versions.py --check

    # Bump version (patch/minor/major)
    python scripts/sync-versions.py --bump patch
    python scripts/sync-versions.py --bump minor
    python scripts/sync-versions.py --bump major

    # Set specific version
    python scripts/sync-versions.py --set 1.2.3
"""

import argparse
import json
import re
import sys
from pathlib import Path

# Paths relative to repository root
REPO_ROOT = Path(__file__).parent.parent
TS_PACKAGE_JSON = REPO_ROOT / "ts" / "package.json"
PY_PYPROJECT_TOML = REPO_ROOT / "python" / "pyproject.toml"
PY_INIT_FILE = REPO_ROOT / "python" / "numbersprotocol_capture" / "__init__.py"


def get_ts_version() -> str:
    """Get version from TypeScript package.json."""
    with open(TS_PACKAGE_JSON) as f:
        data = json.load(f)
    return data["version"]


def get_py_version() -> str:
    """Get version from Python pyproject.toml."""
    content = PY_PYPROJECT_TOML.read_text()
    match = re.search(r'^version\s*=\s*"([^"]+)"', content, re.MULTILINE)
    if match:
        return match.group(1)
    raise ValueError("Could not find version in pyproject.toml")


def set_ts_version(version: str) -> None:
    """Set version in TypeScript package.json."""
    with open(TS_PACKAGE_JSON) as f:
        data = json.load(f)
    data["version"] = version
    with open(TS_PACKAGE_JSON, "w") as f:
        json.dump(data, f, indent=2)
        f.write("\n")
    print(f"  Updated ts/package.json to {version}")


def set_py_version(version: str) -> None:
    """Set version in Python pyproject.toml and __init__.py."""
    # Update pyproject.toml
    content = PY_PYPROJECT_TOML.read_text()
    content = re.sub(
        r'^version\s*=\s*"[^"]+"',
        f'version = "{version}"',
        content,
        flags=re.MULTILINE,
    )
    PY_PYPROJECT_TOML.write_text(content)
    print(f"  Updated python/pyproject.toml to {version}")

    # Update __init__.py
    init_content = PY_INIT_FILE.read_text()
    init_content = re.sub(
        r'^__version__\s*=\s*"[^"]+"',
        f'__version__ = "{version}"',
        init_content,
        flags=re.MULTILINE,
    )
    PY_INIT_FILE.write_text(init_content)
    print(f"  Updated python/numbersprotocol_capture/__init__.py to {version}")


def bump_version(current: str, bump_type: str) -> str:
    """Bump version according to semver."""
    parts = current.split(".")
    if len(parts) != 3:
        raise ValueError(f"Invalid version format: {current}")

    major, minor, patch = map(int, parts)

    if bump_type == "major":
        return f"{major + 1}.0.0"
    elif bump_type == "minor":
        return f"{major}.{minor + 1}.0"
    elif bump_type == "patch":
        return f"{major}.{minor}.{patch + 1}"
    else:
        raise ValueError(f"Invalid bump type: {bump_type}")


def check_versions() -> bool:
    """Check if versions are in sync."""
    ts_version = get_ts_version()
    py_version = get_py_version()

    print("Current versions:")
    print(f"  TypeScript: {ts_version}")
    print(f"  Python:     {py_version}")

    if ts_version == py_version:
        print("\n✓ Versions are in sync")
        return True
    else:
        print("\n✗ Versions are out of sync!")
        return False


def sync_versions(version: str) -> None:
    """Sync both SDKs to the specified version."""
    print(f"Setting version to {version}...")
    set_ts_version(version)
    set_py_version(version)
    print(f"\n✓ Both SDKs updated to version {version}")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Synchronize versions across TypeScript and Python SDKs"
    )
    parser.add_argument(
        "--check",
        action="store_true",
        help="Check if versions are in sync",
    )
    parser.add_argument(
        "--bump",
        choices=["patch", "minor", "major"],
        help="Bump version (patch/minor/major)",
    )
    parser.add_argument(
        "--set",
        dest="set_version",
        metavar="VERSION",
        help="Set specific version (e.g., 1.2.3)",
    )

    args = parser.parse_args()

    if not any([args.check, args.bump, args.set_version]):
        parser.print_help()
        sys.exit(1)

    if args.check:
        success = check_versions()
        sys.exit(0 if success else 1)

    if args.bump:
        current = get_ts_version()
        new_version = bump_version(current, args.bump)
        print(f"Bumping version from {current} to {new_version}")
        sync_versions(new_version)

    if args.set_version:
        # Validate version format
        if not re.match(r"^\d+\.\d+\.\d+$", args.set_version):
            print(f"Error: Invalid version format: {args.set_version}")
            print("Version must be in semver format (e.g., 1.2.3)")
            sys.exit(1)
        sync_versions(args.set_version)


if __name__ == "__main__":
    main()
