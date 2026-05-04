# Workspace Context

<!-- This file is auto-maintained. The Repositories section is refreshed -->
<!-- by the system. The AI should maintain Environment & Key Discoveries. -->

**Workspace root (absolute path):** `/home/workspaces/conversations/71327bb3-03fd-4337-b47f-6e35487a6803`

## Repositories

- **`capture-sdk/`** — Branch: `omni/71327bb3/capture-sdk`, Remote: `numbersprotocol/capture-sdk`
  - Official SDKs for [Numbers Protocol](https://numbersprotocol.io/) Capture API. Register digital assets with blockchain-backed provenance.
  - Has `CLAUDE.md` project instructions

## Environment & Tools

- Release workflow: `.github/workflows/release.yml` publishes npm package `@numbersprotocol/capture-sdk` from `ts/` and PyPI package from `python/` on `v*` tags.
- npm publishing uses GitHub Actions trusted publishing/OIDC with Node.js 24; no `NPM_TOKEN` is required for npm publish.

## Key Discoveries

- TypeScript package `ts/package.json` repository URL is `git+https://github.com/numbersprotocol/capture-sdk.git` with `directory: "ts"`, matching npm trusted publisher requirements for the GitHub repo.

---
_Last system refresh: 2026-05-04 08:48 UTC_
