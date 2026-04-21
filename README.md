# Risotron

Risotron is a Phase 1 walking skeleton that proves a local scaffold → publish → install → auto-update
loop for owner-built Electron apps. It ships two packages — `@risotron/runtime` (the thin
Electron-host library consumed by scaffolded apps) and `@risotron/studio` (the CLI + local Web UI
that scaffolds a new app and creates a private GitHub release repo for it).

This is a **verification tool for the owner**, not a product for external developers. Phase 1
is macOS arm64 only.

> **Status — 2026-04-21:** Walking-skeleton is CODE-COMPLETE (9 briefs merged). Functional QA
> sign-off is in flight; `v0.1.0` tag is gated on the QA verdict.

---

## Prerequisites

- macOS (Apple Silicon). Phase 1 does not target x64, Windows, or Linux.
- Node.js 20 or newer.
- Corepack enabled: `corepack enable` (activates the pinned pnpm version).
- GitHub CLI installed and authenticated for publishing: `brew install gh && gh auth login`
  (scopes: `repo`, `workflow`).

## Install (this repo)

```sh
pnpm install
pnpm -r build
```

## Run Studio

```sh
pnpm --filter @risotron/studio exec risotron studio
```

This spins a Hono + Vite local server (port auto-picked from `5173..5183`) and opens the Studio
Web UI in your default browser. The UI has two flows:

1. **New project** — scaffold a new App X at a user-chosen path. Token-substitutes the template at
   `packages/studio/templates/default-app/`, vendors `@risotron/runtime` as a `pnpm pack` tarball
   into `<AppX>/vendor/`, and writes a default `risotron.config.ts`.
2. **New release server** — shell out to `gh repo create --private` to create
   `<ghOwner>/<appSlug>-releases`, then overwrite `risotron.config.ts` with the real provider config.

Studio is a **bootstrap tool** — it runs only at project-creation and release-server-creation
moments. There is no project-management UI, no version bump button, no ongoing dashboard.

## Publish from a scaffolded App X

Run inside the scaffolded App X root after committing or stashing local changes:

```sh
cd <scaffolded-app-x-dir>
pnpm install
pnpm start            # sanity check — launches App X locally
npm version patch     # bump version + git tag
risotron publish
```

The `risotron publish` pipeline:

1. **Preflight** — checks working tree is clean (`git diff --quiet` on both staged and unstaged).
2. **Version check** — for `releaseProvider === 'github'`, runs
   `gh release view v<version> --repo <owner>/<name>`. Not-found = OK to proceed; match aborts.
   See [ADR-0007](https://github.com/risotron/risotron/wiki/ADR-0007-publish-cli-github-preflight).
3. **Package** — `electron-forge package` produces an `.app` in `out/`.
4. **Make** — `electron-forge make` produces `.dmg` + `.zip`; a `postPackage` hook runs
   `codesign --force --deep --sign - <app>` (ad-hoc). See
   [ADR-0004](https://github.com/risotron/risotron/wiki/ADR-0004-ad-hoc-code-sign-phase-1) for
   rationale and the matching `autoUpdater.verifyUpdateCodeSignature` override.
5. **Publish** — `electron-forge publish` with `@electron-forge/publisher-github` using a
   `GH_TOKEN` fetched on demand via `gh auth token` (never stored).
6. **Post-publish** — prints the release URL.

Use `--dry-run` to exercise everything except the final upload:

```sh
risotron publish --dry-run
```

## Install on a second Mac

```sh
# 1. Download AppX-<ver>.dmg from the GitHub release
# 2. Open the DMG and drag AppX.app into /Applications
# 3. Strip Gatekeeper quarantine attr (ad-hoc signed, so this is required):
xattr -dr com.apple.quarantine /Applications/AppX.app
# 4. Launch AppX.app — a window shows the version string + Check + Update buttons
```

Subsequent updates are applied via the in-app **Check** button (queries the GitHub release feed)
and **Update** button (downloads + `quitAndInstall`).

## Test harness

The full 8-step manual E2E checklist lives at
[`test/e2e-walking-skeleton.md`](./test/e2e-walking-skeleton.md). Run it at every release gate.
It covers: clone → Studio → scaffold → `pnpm install` → first publish → Machine-B install of
`v0.1.0` → version bump + re-publish → Machine-B auto-update to `v0.1.1`.

Each step has `[ ]` observable-outcome checkboxes including visible-window checks (launched-but-
invisible counts as **FAIL**), explicit machine labels (`A` = dev Mac, `B` = user Mac), and a
sign-off table at the end.

There is one helper script at `test/scripts/clean-slate-machine-a.sh` that wipes
`~/tmp/risotron-e2e` and `~/tmp/walking-demo` between runs. It does NOT touch any GitHub release
repo. `test/README.md` is the one-paragraph usage note.

**Known workaround:** if `pnpm install` in the scaffolded App X fails with `404 Not Found` on
`electron-41.2.x.tgz`, pin `electron` exact to `41.2.1` in the scaffolded `package.json` and
record it in the sign-off table. Documented in the harness preconditions.

## Packages

| Package | Description |
|---|---|
| [`@risotron/runtime`](./packages/runtime) | Thin Electron-host library: `createApplication()`, window shell, preload bridge (`window.risotron.updates.*` + escape hatch), `IReleaseProvider` + `GithubReleaseProvider` + `GenericHttpProvider` (stub). Consumed by App X via a vendored tarball during Phase 1. |
| [`@risotron/studio`](./packages/studio) | CLI + local Web UI. Provides `risotron studio` (spins Hono + Vite, opens browser) and `risotron publish` (preflight + thin passthrough to `electron-forge publish`). Templates live at `packages/studio/templates/default-app/`. |

## Architecture references

- [Phase 1 — Technical Spec](.skynet/workspace/20260420-phase1-walking-skeleton/spec.md) — authoritative as-built spec (workspace copy carries the §9 implementation change log).
- [Phase 1 — ADRs](.skynet/workspace/20260420-phase1-walking-skeleton/decisions.md) — ADR-001..006.
- [Wiki Home](https://github.com/risotron/risotron/wiki) — promoted specs + numbered ADRs + Changelog.

## Out-of-scope for Phase 1

DI / Service Registry / Commands / Configuration / Storage; widget library; layout presets;
theme system; project-management UI; automatic update polling; providers beyond GitHub + the
`generic-http` stub; Windows / Linux targets; Developer-ID signing + notarization; automated
CI/CD. All deferred to v0.2+.

## Scripts

```sh
pnpm build           # build all workspace packages
pnpm dev             # TypeScript watch mode, all packages in parallel
pnpm lint            # eslint over .ts / .tsx
pnpm format          # prettier write
```
