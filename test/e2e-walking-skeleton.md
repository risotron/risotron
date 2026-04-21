# Phase 1 Walking Skeleton - E2E Manual Test

**Test date:** `_____________` **Tester:** `_____________`
**Runtime version:** `_____________` **Studio version:** `_____________`

## Preconditions

- [ ] MACHINE A: macOS, Node 20+, `corepack enable`, `gh auth login` completed
- [ ] MACHINE B: macOS, ability to install DMGs, shell access for `xattr` command
- [ ] Both machines are on the same network OR Machine B has internet access to download releases
- [ ] GitHub account can create a private repo named `walking-demo-releases`
- [ ] If `pnpm install` in the scaffolded App X fails with a 404 on
      `electron-41.2.x.tgz`, pin electron exact (`41.2.1`) in the scaffolded
      `package.json` as a workaround and note it in the sign-off table

---

## Step 1 - Clone and build Risotron

_Machine: **A**_

```bash
git clone git@github.com:risotron/risotron.git ~/tmp/risotron-e2e
cd ~/tmp/risotron-e2e
corepack enable
pnpm install
pnpm -r build
```

Expected:

- [ ] `pnpm install` exits 0
- [ ] `pnpm -r build` exits 0
- [ ] `packages/runtime/dist/index.js` exists
- [ ] `packages/studio/dist/cli/studio.js` exists

---

## Step 2 - Launch Studio

_Machine: **A**_

```bash
cd ~/tmp/risotron-e2e
./packages/studio/bin/risotron.mjs studio
```

Expected:

- [ ] Terminal prints `Studio running at http://localhost:<port>`
- [ ] Default browser opens to that URL
- [ ] Home page shows links to "New Project" and "New Release Server"

---

## Step 3 - Scaffold App X

_Machine: **A**_

Click **New Project**. Fill:

- appName: `WalkingDemo`
- appSlug: `walking-demo` (auto-filled)
- author: `<your name>`
- targetDir: `~/tmp/walking-demo`
- releaseProvider: `github`
- ghOwner: `<your gh username>`

Click **Create**.

Expected:

- [ ] Wizard shows `Files created: N` success message
- [ ] `~/tmp/walking-demo/package.json` exists with `"name": "walking-demo"`
- [ ] `~/tmp/walking-demo/risotron.config.ts` contains `owner: '<your gh username>'`
- [ ] `~/tmp/walking-demo/vendor/risotron-runtime-0.1.0.tgz` exists
- [ ] No `.tmpl` files remain in `~/tmp/walking-demo/`
- [ ] Scaffolded `package.json` pins `@risotron/runtime` to the local vendor tarball

```bash
cd ~/tmp/walking-demo
pnpm install
```

Expected:

- [ ] `pnpm install` exits 0 and resolves `@risotron/runtime` from the vendor tarball

If `pnpm install` fails with a transient upstream npm 404 for
`electron-41.2.x.tgz`, apply this Phase 1 workaround and rerun `pnpm install`:

```bash
node -e 'const fs=require("node:fs"); const p="package.json"; const pkg=JSON.parse(fs.readFileSync(p,"utf8")); pkg.devDependencies={...pkg.devDependencies,electron:"41.2.1"}; fs.writeFileSync(p, JSON.stringify(pkg, null, 2) + "\n");'
pnpm install
```

Expected after workaround, only if needed:

- [ ] `package.json` contains `"electron": "41.2.1"` exactly
- [ ] `pnpm install` exits 0
- [ ] Sign-off notes record that the electron 41.2.1 pin workaround was used

---

## Step 4 - Create release server

_Machine: **A**_

Back in the Studio UI, click **New Release Server**. Fill:

- appXDir: `~/tmp/walking-demo`
- ghOwner: `<your gh username>`
- repoName: `walking-demo-releases` (auto-filled)

Click **Create**.

Expected:

- [ ] Wizard shows the new repo URL as a clickable link
- [ ] Visiting that URL on GitHub shows a private, empty repo named `walking-demo-releases`
- [ ] `~/tmp/walking-demo/risotron.config.ts` now references that repo

---

## Step 5 - First publish

_Machine: **A**_

```bash
cd ~/tmp/walking-demo
git init
git add .
git commit -m "initial"
risotron publish
```

Expected:

- [ ] Preflights all pass: git clean, version not yet published, `gh` auth OK
- [ ] `electron-forge package` builds successfully
- [ ] `electron-forge make` runs the postPackage hook and signs ad-hoc
- [ ] `electron-forge make` produces `.dmg` and `.zip` in `out/make/`
- [ ] `electron-forge publish` uploads assets to the release repo
- [ ] Final log line shows the release URL on GitHub
- [ ] Visiting the release URL shows version `0.1.0` with `.dmg` and `.zip` assets

```bash
codesign -dv "$(find out -name WalkingDemo.app -type d -print -quit)" 2>&1 | grep Signature
```

Expected:

- [ ] Output contains `Signature=adhoc`

---

## Step 6 - Install on Machine B

_Machine: **B**_

1. In a browser, download `WalkingDemo-0.1.0.dmg` from the release repo
2. Open the DMG, drag `WalkingDemo.app` to `/Applications`
3. In Terminal:

```bash
xattr -dr com.apple.quarantine /Applications/WalkingDemo.app
```

4. Double-click `WalkingDemo.app`

Expected:

- [ ] App process stays alive for at least 5 seconds after launch
- [ ] A concrete, visible Electron window is on screen with title bar `WalkingDemo`,
      rendered version string `v0.1.0`, and both **Check for Updates** and **Update**
      buttons visible
- [ ] A launched-but-invisible window, off-screen window, blank renderer, or missing
      visual controls is treated as **FAIL**, even if the process stays alive
- [ ] **Check for Updates** button is enabled
- [ ] **Update** button is disabled

Click **Check for Updates**:

- [ ] Status text changes to `Up to date` because `v0.1.0` is the latest
- [ ] **Update** button remains disabled

---

## Step 7 - Bump version and re-publish

_Machine: **A**_

```bash
cd ~/tmp/walking-demo
echo "// bump" >> src/main.ts
git add .
git commit -m "trivial change"
npm version patch
risotron publish
```

Expected:

- [ ] `npm version` prints `v0.1.1`
- [ ] `risotron publish` preflights pass and re-publishes
- [ ] GitHub release repo shows `v0.1.1` assets alongside `v0.1.0`

---

## Step 8 - Auto-update on Machine B

_Machine: **B**_

With `WalkingDemo.app` still running from Step 6:

Click **Check for Updates**:

- [ ] Status changes to `Update available: 0.1.1`
- [ ] **Update** button enables

Click **Update**:

- [ ] Progress percentages display, such as `10%`, `40%`, and `100%`
- [ ] App quits automatically
- [ ] App relaunches showing `v0.1.1` in the window
- [ ] After relaunch, a concrete, visible Electron window is on screen with title bar
      `WalkingDemo`, rendered version string `v0.1.1`, and both **Check for Updates**
      and **Update** buttons visible
- [ ] A relaunched-but-invisible window, off-screen window, blank renderer, or missing
      visual controls is treated as **FAIL**, even if the process is running

---

## Dry-run evidence

- [ ] Two-Mac setup completed with MACHINE A and MACHINE B as separate Macs
- [ ] If only one Mac was available, tester signed this deviation in the notes:
      `One-Mac dry-run completed by __________ on __________; two-Mac install/update path not independently verified in this run.`
- [ ] Any skipped checkbox includes a reason in the sign-off notes

---

## Sign-off

| Step                     | Pass? | Tester | Date | Notes |
| ------------------------ | ----- | ------ | ---- | ----- |
| 1 - Clone/build          | Y/N   |        |      |       |
| 2 - Launch Studio        | Y/N   |        |      |       |
| 3 - Scaffold App X       | Y/N   |        |      |       |
| 4 - Create release repo  | Y/N   |        |      |       |
| 5 - First publish        | Y/N   |        |      |       |
| 6 - Install on Machine B | Y/N   |        |      |       |
| 7 - Bump + republish     | Y/N   |        |      |       |
| 8 - Auto-update on B     | Y/N   |        |      |       |

**Overall Phase 1 acceptance:** [ ] PASS [ ] FAIL - re-run on `__________`
