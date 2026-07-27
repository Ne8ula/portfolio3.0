---
name: run-portfolio
description: Launch the Portfolio 3.0 cockpit app locally and drive it far enough to see a change. Use when asked to run, start, preview, or screenshot the portfolio, or to confirm a 3D/HUD change works in the real app.
---

# Running Portfolio 3.0

Next.js 16 (App Router, Turbopack) + React 19 + imperative three.js.
Single page: [app/page.tsx](../../../app/page.tsx) dynamically imports
`CockpitApp` with `ssr:false`, so **everything renders client-side** —
the served HTML is a shell and tells you nothing about whether the
scene works.

## 1. Check dependencies BEFORE launching

`node_modules` in this repo drifts. The lockfile is correct; the
installed tree often isn't. Missing `@pmndrs/vanilla` is the recurring
one — [materials.ts](../../../components/cockpit/materials.ts) imports
`MeshTransmissionMaterial` from it, and every route 500s with
`Module not found` if it's absent.

```bash
for p in three @pmndrs/vanilla postprocessing three-mesh-bvh next react; do
  [ -d "node_modules/$p" ] && echo "OK   $p" || echo "MISS $p"
done
```

Any `MISS` → `npm install`. Expect it to prune extraneous packages
(~190) as well; that's normal and leaves `git status` clean.

## 2. Launch

```bash
npm run dev        # run in background — it does not exit
```

Serves on **http://localhost:3000**. Healthy cold start on Apple
silicon is ~1.4s ("Ready in …"); first compile of `/` ~1.3s, warm
requests ~15ms, incremental recompiles <100ms.

Wait for readiness by polling, not by sleeping blind:

```bash
for i in $(seq 1 60); do curl -s -o /dev/null --max-time 2 http://localhost:3000/ && break; sleep 1; done
curl -s -o /dev/null -w "status=%{http_code}\n" http://localhost:3000/
```

**A 200 is necessary but not sufficient.** Turbopack serves a 500 error
page for compile failures, so always check the dev server log too — the
real error lands there, not in the HTML.

## 3. Drive it

The app gates on a **boot terminal**: an `[ENTER THE ROOM]` confirm
that needs a real Enter / Space / click. Nothing past the boot screen
is reachable without input.

### Static check — boot screen only

Verifies the bundle compiles and the DOM HUD paints. No WebGL
interaction, no cockpit.

```bash
cd "$SCRATCH" && "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless --enable-unsafe-swiftshader --no-sandbox \
  --screenshot=boot.png --window-size=1440,900 \
  --virtual-time-budget=8000 http://localhost:3000/
```

Then **read the PNG**. A correct boot screen shows the AX.RUNTIME
cold-start terminal, the `/dev/console · dmesg` log, a serif
`[LOADING]` slug, and the registers/bus rail. A blank or cream-only
frame means the client bundle threw.

### Real check — the cockpit itself

There is **no `chromium-cli` or Playwright installed**. Anything past
boot (warp transition, transmissive glass, hover glow, crate → deck
flow, the holo card) needs either a real browser or a CDP driver you
write yourself.

For a human at the machine, open the real browser — this is also the
only path that exercises the actual GPU:

```bash
open -a "Google Chrome" http://localhost:3000
```

Then press **Enter** to clear the gate → warp (~2.5s) → cockpit.

Useful once you're in:

- `window.__warpTimeScale = 4` — slow the warp 4× to inspect it.
- `window.__setCockpitViewMode('crate')` / `'deck'` / `'monitor'` /
  `'cockpit'` — jump straight to a view without clicking through.
- `window.__cockpitDeck.play({index: 2, from: …})` — deck machinery.
- Full bridge contract is catalogued in
  [CLAUDE.md](../../../CLAUDE.md) under `window.__cockpit*`.

Set `prefers-reduced-motion: reduce` to skip the warp entirely when you
only care about the cockpit.

## 4. Gotchas that look like bugs

- **Weather chip** reverse-geocode hits CORS on localhost — it falls
  back to coords-only. Not a regression.
- **`baseline-browser-mapping` staleness warning** on boot is noise.
- The stage div scrolls programmatically despite `overflow:hidden`;
  its `onScroll` pins scroll to 0. Leave it.
- Screenshots of transmissive materials under SwiftShader are **not**
  representative — software rasterization renders transmission very
  differently from Metal. Judge glass, frost, and the beam only on a
  real GPU.
