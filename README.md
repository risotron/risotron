# Risotron

Risotron is a Phase 1 walking skeleton for proving a local Electron app scaffold, publish, install,
and update loop.

## Prerequisites

- Node.js 20 or newer
- Corepack enabled: `corepack enable`
- GitHub CLI authenticated for later Studio publishing work: `gh auth login`

## Install

```sh
pnpm install
```

## Build

```sh
pnpm -r build
```

## Dev

```sh
pnpm dev
```

The dev command starts TypeScript watch mode for all workspace packages.

## Publish

Run from a scaffolded App X root after committing or stashing local changes:

```sh
risotron publish
```

Use `--dry-run` to run preflight, package, and make without uploading artifacts:

```sh
risotron publish --dry-run
```

The publish command fetches a token with `gh auth token` and injects it only into the
`electron-forge publish` child process as `GH_TOKEN`.

## Next

Later briefs complete the default App X template and E2E checklist.
