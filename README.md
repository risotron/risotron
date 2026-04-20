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

Publishing is implemented in a later Phase 1 brief. For now, the planned command is:

```sh
risotron publish
```

## Next

Brief-2 fills in `@risotron/runtime`. Later briefs replace the Studio CLI stub with `risotron
studio` and `risotron publish`.
