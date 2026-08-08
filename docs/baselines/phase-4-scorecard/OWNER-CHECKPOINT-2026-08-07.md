# Phase 4 hardware scorecard — owner checkpoint

Status: **APPROVED**

this checkpoint is completed and signed only by the portfolio
owner after a headed, real-Chrome hardware capture on mains power. Agents
may prepare this template but must not run, certify, or sign the owner
hardware capture.

## Capture identity

- Capture file: `owner-hardware-2026-08-07.json`
- Summary file: `owner-hardware-2026-08-07.md`
- Capture date (UTC): 2026-08-07T19:55:37.646Z
- Git commit: `9fab531a5aef694e68d71ec37ca18b419d0c615c`
- `git.dirty: false` confirmed: recorded `false` in the artifact
- Browser and version: chrome 151.0.7922.108
- OS and version: darwin 25.5.0 arm64
- Hardware model: Apple M4 Pro (per the unmasked renderer string)
- Power source (must be mains): Mains power - AC adapter connected
- Unmasked WebGL vendor: `Google Inc. (Apple)`
- Unmasked WebGL renderer:
  `ANGLE (Apple, ANGLE Metal Renderer: Apple M4 Pro, Unspecified Version)`
- Renderer classification (`hardware` required): `hardware`

## Protocol confirmation

- [x] Captured from a clean checkout of the committed Phase 4 harness.
- [x] Used `seed = "ax-cockpit-phase4-v1"` and `timeMs = 12000`.
- [x] Used the full 24-cell matrix and three fresh-page repeats per cell.
- [x] The harness ran strictly serially and not concurrently with e2e.
- [x] Required font descriptors loaded before scene construction.
- [x] Every cell reached `getVisualAssetState().pending === 0`.
- [x] Every cell reported zero failed visual assets.
- [x] Every cell passed the blank-canvas precondition.
- [x] Every cell recorded zero unexpected console/page/network diagnostics.
- [x] The renderer identity is hardware and was not compared with SwiftShader.
- [x] Both themes and cockpit/crate/deck views were visually spot-checked.

## Owner decision

- [x] APPROVED
- [ ] REJECTED — investigation required

Notes:

Owner name: Alex

Owner signature/approval statement: Owner Approved.

Approval timestamp (UTC): 2026-08-07T20:02:48Z

---

# Appendix — evidence review (agent-prepared; not an attestation)

Prepared by reading `owner-hardware-2026-08-07.json` and
`scripts/perf/visual-scorecard.ts` at commit `9fab531`. Nothing here
substitutes for the owner confirmations above; it records what the artifact
and the harness do and do not establish, so each box can be ticked (or not)
against evidence.

## A. Established by the artifact and the harness

**Clean checkout of the committed harness.** `git.commit` is
`9fab531a5aef694e68d71ec37ca18b419d0c615c`, which is the current `HEAD` and
the commit that introduced the harness; `git.dirty` is `false`.
`assertCleanGitStatus` rejects any tracked *or* untracked worktree change
before capture, and `scripts/perf/visual-scorecard.ts` is byte-identical to
its state in that commit.

**Canonical capture config.** `capture` records
`seed: "ax-cockpit-phase4-v1"`, `timeMs: 12000`, `pauseAmbient: true`,
`sampleGrid: 256`, `quantBits: 4`, `sobelThreshold: 24`,
`metricsVersion: 1` — matching design §6.1 exactly.

**Full matrix and repeat count.** 24 cells, each with exactly 3 repeats
(72 page loads). The matrix is complete: viewports `reference-normal`
1440×900 and `owner-laptop` 1512×982 × views cockpit/crate/deck × DPR 1
and 2 × themes dark and light. The harness aborts if the cell count is
not 24.

**Fonts before the scene renders.** Every descriptor in
`SCORECARD_FONT_DESCRIPTORS` is loaded, `document.fonts.ready` is awaited,
and `document.fonts.check()` is asserted per descriptor — all before
`configureVisualCapture`/`skipIntro` drive the capture. A missing
descriptor throws and fails the cell.

**Asset settling and failures.** Each repeat waits for
`getVisualAssetState().pending === 0` under a bounded timeout, then throws
if `failed > 0`. A completed 24-cell artifact therefore implies both
conditions held for all 72 repeats.

**Blank-canvas precondition.** Enforced per repeat: `distinctColors >= 8`,
`dominantShare < 0.98`, `nonBackgroundFraction > 0.02`, otherwise the cell
throws by name. All 72 repeats cleared it.

**Unexpected diagnostics.** All 24 cells record `unexpectedErrors: 0`.
`summarizeDiagnostics` throws on the first non-allowlisted console
error/warning, page error, failed request, or unexpected HTTP response, so
the run could not have completed otherwise. See §C for the allowlisted
diagnostics that *were* observed.

**Hardware identity, no SwiftShader comparison.** Classification is
`hardware` with a real Metal/ANGLE renderer string. The browser is
`chrome 151.0.7922.108` — the real Chrome channel, distinct from the
`playwright-chromium 151.0.7922.34` used for the software baseline. The
harness refuses a hardware capture that resolves to `software`, and refuses
any cross-backend comparison outright. `history` holds a single entry
(`reason: "initial baseline"`), which means no `--compare-baseline` was
passed: this run minted a baseline and compared against nothing.

**Serial execution.** The harness is structurally serial — one browser, one
context, one page per repeat, closed in a `finally` before the next. It
owns its own development server on a fresh port. Note that this covers only
the harness's own behaviour; see §B.

## B. Not recordable — owner first-hand attestation only

The artifact contains no field that can establish these. Tick them from
your own memory of the run, or leave them unticked.

1. **Mains power.** Not observable by the harness at all.
2. **No concurrent e2e or other WebGL workload on the host.** The harness
   guarantees it does not parallelise itself; it cannot see other
   processes. This is the second half of the "strictly serially and not
   concurrently with e2e" box.
3. **Headed session.** `--headed` and `--browser-channel` are enforced CLI
   preconditions for a hardware capture, and the Chrome channel is
   corroborated by the browser string — but the artifact does not record
   whether a window was actually visible.
4. **Visual spot-check of both themes across cockpit, crate, and deck.**
   Human review by design; the scorecard is a collapse detector, not a
   judgement of whether the scene reads well.

## C. Points to weigh before deciding

**Three allowlist entries were added in the capture commit.** Commit
`9fab531` ("Phase 4: allow observed scorecard diagnostics") populated the
previously empty allowlist. Each carries a reason and `reviewDate:
'2026-08-07'` as the README requires, but the README also requires them to
be owner-visible, so they are surfaced here. Totals across this hardware
run:

| Allowlist id | Matches | Character |
|---|---:|---|
| `three-clock-deprecated` | 144 | Deterministic — exactly 2 per repeat across all 72 repeats. `THREE.Clock` deprecation from the two existing scene clocks; migration deferred out of Phase 4. |
| `vercel-analytics-dev-orb` | 56 | Non-deterministic (56 here vs 15 on the SwiftShader run). Development-only Vercel Analytics script blocked by Chromium ORB; does not exist in a production build. |
| `swiftshader-readpixels-stall` | 0 | Correctly inert on hardware; it matched once on the software capture. |

None of these are unexpected errors under the protocol, so the ninth
checkbox is literally satisfied. The decision to accept the three entries
is nonetheless yours, since the allowlist went from empty to three entries
in the same commit the baseline was captured from.

**Band conformance is not independent evidence here.** Every median sits
inside its own recorded band, but for an initial baseline the bands are
derived from those same three repeats, so this is true by construction. It
becomes meaningful only when a future capture is compared against this
file. This run mints the reference; it does not validate anything against
a prior one.

**`buildMode: "development"` is intended, not a defect.** Design §5.3 item
1 requires the scorecard to run against a development server, because
`configureVisualCapture` is dev-only by design. Production-shaped coverage
stays with the §9.6.2 blank-canvas check and §9.7 human review.

**Both captures share commit `9fab531`,** so the software and hardware
baselines have matched provenance. Per §6.3 they must still never be
compared metric-to-metric, merged, averaged, or substituted.

## D. APPROVED

The capture artifacts and this checkpoint are currently untracked. The
scorecard artifacts are immutable once recorded: rebaselining mints a new
environment ID rather than overwriting `owner-hardware-2026-08-07.*`.
Hardware rebaselines are owner-certified only. OWNER APPROVED. 
