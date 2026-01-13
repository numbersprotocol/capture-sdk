#!/usr/bin/env python3
"""
Feature parity checker for capture-sdk monorepo.

This script helps maintain feature parity between TypeScript and Python SDKs
by checking for corresponding implementations.

Usage:
    python scripts/check-feature-parity.py
"""

import re
from dataclasses import dataclass
from pathlib import Path

REPO_ROOT = Path(__file__).parent.parent


@dataclass
class Feature:
    name: str
    ts_implemented: bool = False
    py_implemented: bool = False


# Define expected features
EXPECTED_FEATURES = {
    # Client methods
    "Capture.register": Feature("register"),
    "Capture.update": Feature("update"),
    "Capture.get": Feature("get"),
    "Capture.getHistory": Feature("get_history"),
    "Capture.getAssetTree": Feature("get_asset_tree"),
    # Types
    "Type.CaptureOptions": Feature("CaptureOptions"),
    "Type.RegisterOptions": Feature("RegisterOptions"),
    "Type.UpdateOptions": Feature("UpdateOptions"),
    "Type.SignOptions": Feature("SignOptions"),
    "Type.Asset": Feature("Asset"),
    "Type.Commit": Feature("Commit"),
    "Type.AssetTree": Feature("AssetTree"),
    # Errors
    "Error.CaptureError": Feature("CaptureError"),
    "Error.AuthenticationError": Feature("AuthenticationError"),
    "Error.PermissionError": Feature("PermissionError"),
    "Error.NotFoundError": Feature("NotFoundError"),
    "Error.InsufficientFundsError": Feature("InsufficientFundsError"),
    "Error.ValidationError": Feature("ValidationError"),
    "Error.NetworkError": Feature("NetworkError"),
    # Crypto
    "Crypto.sha256": Feature("sha256"),
    "Crypto.verifySignature": Feature("verify_signature"),
}


def check_ts_features() -> None:
    """Check which features are implemented in TypeScript."""
    ts_dir = REPO_ROOT / "ts" / "src"

    # Read all TypeScript source files
    ts_content = ""
    for ts_file in ts_dir.glob("*.ts"):
        ts_content += ts_file.read_text()

    # Check client methods
    for key, feature in EXPECTED_FEATURES.items():
        if key.startswith("Capture."):
            method = key.split(".")[1]
            # Look for method definition in class
            if re.search(rf"async\s+{method}\s*\(", ts_content):
                feature.ts_implemented = True
        elif key.startswith("Type."):
            type_name = key.split(".")[1]
            if re.search(rf"(interface|type)\s+{type_name}", ts_content):
                feature.ts_implemented = True
        elif key.startswith("Error."):
            error_name = key.split(".")[1]
            if re.search(rf"class\s+{error_name}", ts_content):
                feature.ts_implemented = True
        elif key.startswith("Crypto."):
            func_name = key.split(".")[1]
            if re.search(rf"(export\s+)?(async\s+)?function\s+{func_name}", ts_content):
                feature.ts_implemented = True


def check_py_features() -> None:
    """Check which features are implemented in Python."""
    py_dir = REPO_ROOT / "python" / "capture_sdk"

    # Read all Python source files
    py_content = ""
    for py_file in py_dir.glob("*.py"):
        py_content += py_file.read_text()

    # Check features with Python naming conventions
    for key, feature in EXPECTED_FEATURES.items():
        if key.startswith("Capture."):
            method = key.split(".")[1]
            # Convert camelCase to snake_case for Python
            py_method = re.sub(r"([A-Z])", r"_\1", method).lower().lstrip("_")
            if re.search(rf"def\s+{py_method}\s*\(", py_content):
                feature.py_implemented = True
        elif key.startswith("Type."):
            type_name = key.split(".")[1]
            if re.search(rf"class\s+{type_name}", py_content):
                feature.py_implemented = True
        elif key.startswith("Error."):
            error_name = key.split(".")[1]
            if re.search(rf"class\s+{error_name}", py_content):
                feature.py_implemented = True
        elif key.startswith("Crypto."):
            func_name = key.split(".")[1]
            # Convert camelCase to snake_case
            py_func = re.sub(r"([A-Z])", r"_\1", func_name).lower().lstrip("_")
            if re.search(rf"def\s+{py_func}\s*\(", py_content):
                feature.py_implemented = True


def print_report() -> None:
    """Print feature parity report."""
    print("=" * 60)
    print("Feature Parity Report")
    print("=" * 60)
    print()

    categories = {
        "Client Methods": [],
        "Types": [],
        "Errors": [],
        "Crypto Utilities": [],
    }

    for key, feature in EXPECTED_FEATURES.items():
        if key.startswith("Capture."):
            categories["Client Methods"].append((key, feature))
        elif key.startswith("Type."):
            categories["Types"].append((key, feature))
        elif key.startswith("Error."):
            categories["Errors"].append((key, feature))
        elif key.startswith("Crypto."):
            categories["Crypto Utilities"].append((key, feature))

    total_features = 0
    ts_count = 0
    py_count = 0
    parity_count = 0

    for category, features in categories.items():
        print(f"{category}:")
        print("-" * 40)
        print(f"{'Feature':<30} {'TS':<5} {'PY':<5}")
        print("-" * 40)

        for key, feature in features:
            name = key.split(".")[1]
            ts_status = "✓" if feature.ts_implemented else "✗"
            py_status = "✓" if feature.py_implemented else "✗"
            print(f"{name:<30} {ts_status:<5} {py_status:<5}")

            total_features += 1
            if feature.ts_implemented:
                ts_count += 1
            if feature.py_implemented:
                py_count += 1
            if feature.ts_implemented and feature.py_implemented:
                parity_count += 1

        print()

    print("=" * 60)
    print("Summary")
    print("=" * 60)
    print(f"Total features:     {total_features}")
    print(f"TypeScript:         {ts_count}/{total_features}")
    print(f"Python:             {py_count}/{total_features}")
    print(f"Feature parity:     {parity_count}/{total_features} ({parity_count/total_features*100:.0f}%)")

    if parity_count == total_features:
        print("\n✓ Full feature parity achieved!")
    else:
        missing = total_features - parity_count
        print(f"\n✗ {missing} feature(s) missing parity")


def main() -> None:
    check_ts_features()
    check_py_features()
    print_report()


if __name__ == "__main__":
    main()
