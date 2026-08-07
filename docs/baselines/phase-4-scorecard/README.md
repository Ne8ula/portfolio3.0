# Phase 4 visual scorecards

This directory holds backend-specific deterministic scene-composition
scorecards defined by `docs/phase-4-design.md` §5.3 and §6. The harness
measures color entropy, edge density, luminance contrast, and dominant-color
share. It is a collapse detector, not a pixel-diff system or a substitute for
human visual review.

No baseline capture belongs in the Phase 4 step-3 harness commit. Captures
must be recorded later from a clean checkout of that commit so the artifact
can truthfully record `git.dirty: false`.

## Host discipline

- Run `git status --short` first. The harness rejects any tracked or untracked
  worktree change.
- Capture artifacts are immutable: an existing environment ID is never
  overwritten. Rebaseline under a new ID so the previous evidence remains
  reviewable.
- Stop Playwright, browser automation, and any other WebGL workload. Never run
  this harness concurrently with `npm run test:e2e`.
- The harness starts and owns one development server on a fresh loopback port.
- It uses one browser, one context, and one page at a time; every repeat gets a
  fresh page/context, and all 24 cells × 3 repeats run strictly serially.
- Keep SwiftShader and hardware artifacts separate. Comparison requires the
  exact unmasked vendor, renderer string, and classification.

## SwiftShader capture

Engineering records the software baseline with bundled Chromium and forced
SwiftShader:

```sh
node --import tsx scripts/perf/visual-scorecard.ts \
  --capture-kind software \
  --environment-id software-swiftshader-YYYY-MM-DD
```

Another software renderer such as llvmpipe or WARP is rejected; it is not a
SwiftShader substitute.

## Owner hardware capture

Only the owner runs and certifies the hardware baseline. Use real Chrome,
headed, on mains power:

```sh
node --import tsx scripts/perf/visual-scorecard.ts \
  --capture-kind hardware \
  --environment-id owner-hardware-YYYY-MM-DD \
  --browser-channel chrome \
  --headed
```

Copy `OWNER-CHECKPOINT.template.md` to a dated checkpoint file and complete
it only after reviewing the generated JSON/Markdown pair. Agents must not
complete or sign the owner checkpoint.

## Comparison and rebaselining

Pass `--compare-baseline <json>` to require exact renderer identity and keep
every captured median inside the matching cell's recorded metric bands. A GPU,
driver, OS, vendor, or renderer-string change mints a new hardware baseline;
do not widen bands to cross backend boundaries.

Hardware rebaselines are owner-certified only. Engineering may re-record a
SwiftShader baseline with independent QA verification and an owner-visible
history entry containing date, commit, and reason. Over-band results must be
investigated or explicitly rebaselined; never replace evidence silently.

The allowlist for console warnings/errors, page errors, rejected requests,
and unexpected HTTP 4xx/5xx responses starts empty. Add an entry only after a
fresh run observes a known-benign condition, with a reason and review date.
