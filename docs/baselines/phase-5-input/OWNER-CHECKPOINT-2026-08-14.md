# Phase 5 input and framing owner checkpoint — 2026-08-14

Status: COMPLETE, OWNER APPROVED

This is the single dated Phase 5 checkpoint record. Repeated reviews append
dated owner-authored entries to the §5 decision history; the latest entry
governs both AC-27 and AC-28. This record does not govern acceptance until
the owner completes AC-27, the §4 signature block, and a §5 decision row.

> **Transcription provenance.** On 2026-08-14T00:09-0400 the owner directed
> in-session: “approve all AC-28.” An agent transcribed the twelve §3 review
> rows, the AC-28 `approved` mark, and “Requested changes: none” at that
> direction. The approval decision is the owner's.

## 1. Capture and reviewer identity

Values marked *agent-detected* or *agent-suggested* are preparation aids read
from the expected review host on 2026-08-13; the owner confirms or corrects
each in the dated record. Bare `[OWNER TO COMPLETE]` fields are owner-only.

- Owner name: `Alex`
- Review date/time (ISO 8601 with time zone): `2026-08-14T00:09:52-0400`
- OS and version: `macOS 26.5.2 (build 25F84), Darwin 25.5.0 arm64`
  *(agent-detected — confirm this is the review host)*
- Browser and version: `Google Chrome 151.0.7922.138` *(agent-detected
  installed version; Phase 4 review used branded Chrome — confirm)*
- Computer/hardware model: `MacBook Pro (Mac16,7), Apple M4 Pro`
  *(agent-detected — confirm)*
- Precision trackpad make/model or built-in hardware: `Built-in MacBook Pro
  Force Touch trackpad` *(agent-suggested — confirm)*
- Detented wheel mouse make/model: `Razer Deathadder Pro`
- Detented wheel test host and OS: `Macbook Pro`
- Appearance(s) used for AC-27: `Light/Dark`
- Reduced-motion setting(s) used: `All of them` *(the final §2 trace
  row requires a repeat with reduced motion resolved on)*

## 2. AC-27 — manual hardware input traces

Mark every row `pass` or `fail` and record specific feel/behavior notes. A
blank mark is incomplete. Phase 5 passes AC-27 only when every row is `pass`
and no unresolved `fail` remains.

| Hardware | Trace | Required observation | Mark (`pass`/`fail`) | Feel and behavior notes |
|---|---|---|---|---|
| macOS precision trackpad | Hover from center to all stage edges in cockpit, monitor, deck, and crate | Near-center response is damped; the full bounded yaw/pitch or focused parallax range remains reachable; no overshoot or stuck angle after pointer exit | `pass` | `feels smooth` |
| macOS precision trackpad | Primary drag beyond the 6 px slop in contained mode, including a drag beginning over an artifact and empty deck/crate background | Crop pans deliberately; no artifact activation or click-away fires; release is clean | `pass` | `reactive and smooth, no lag` |
| macOS precision trackpad | Fine two-axis scroll plus a momentum wheel train in contained mode | Fine deltas remain responsive; movement is smooth and bounded; native trackpad momentum is not doubled by controller inertia | `pass` | `bounded movement` |
| macOS precision trackpad | Pinch/browser zoom over the cockpit region | Pinch bypasses contained pan, browser zoom remains available, and the resulting tier/crop remains operable | `pass` | `high quality, remains operable` |
| macOS precision trackpad | Region-bound scroll chaining and pointer/focus exit | At a pan bound, continued scroll reaches the outer document; Tab and pointer can leave the region normally | `pass` | `able to leave the region normally` |
| owner-host detented wheel mouse | Vertical detents in contained mode, from center to both vertical bounds | Each detent produces bounded, predictable movement; the full range remains reachable without spikes | `pass` | `no spikes detected` |
| owner-host detented wheel mouse | Shift+wheel horizontal routing, from center to both horizontal bounds | Horizontal movement is predictable and the full range remains reachable | `pass` | `predictable and reachable` |
| owner-host detented wheel mouse | Wheel at a pan bound and wheel outside the cockpit | The cockpit does not trap scrolling; the outer document scrolls normally | `pass` | `cockpit and outer document is functional and correct` |
| keyboard/control cross-check | Arrow keys, WASD, PageUp/PageDown, Home, and visible RESET | Explicit paths operate; Home and RESET center both axes; focus remains visible | `pass` | `all buttons work correctly and remain visible` |
| reduced-motion cross-check | Repeat explicit trackpad/wheel/keyboard pan with reduced motion resolved on | Parallax and drag-release inertia are absent; explicit panning remains immediate and functional | `pass` | `reduced motion can focus on the three objects` |

### AC-27 tuning response

- Tuning changed in response to the hardware review: `NO`
- Files/tokens changed, or `none`: `none`
- Before/after values and reason, or `none`: `none`
- Confirmation that `responseExponent` tuning did not reduce the reachable
  `±22°/±15°` hover envelope: `YES`
- Remaining failed or unresolved trace rows, or `none`: `none`

### AC-27 owner mark

- [x] `pass` — every trace row is `pass`; no unresolved failure remains.
- [ ] `fail` — one or more trace rows remains unresolved.

## 3. AC-28 — focused-framing visual approval

Review all twelve agent-captured JPEGs against approved decisions D2, D3, and
D6: deck hero framing excludes croppable dust-cover/tonearm scenery while
protecting the plinth/platter/card envelope; crate framing protects the shell,
pulled sleeve, and preview-rise disc while excluding the transient clear
waypoint; monitor/deck/crate retain deliberate hierarchy and usable safe-frame
space. The known deck HUD overlap remains Phase 6 work and is not a Phase 5
stopgap criterion.

Marks below were transcribed at the owner's 2026-08-14 direction (“approve
all AC-28”); no framing change was requested.

| Capture | Reviewed | Notes |
|---|---|---|
| `ac28/monitor-dark-1440x900.jpg` | `YES` | Approved — no framing change requested. |
| `ac28/monitor-light-1440x900.jpg` | `YES` | Approved — no framing change requested. |
| `ac28/monitor-dark-1024x600.jpg` | `YES` | Approved — no framing change requested. |
| `ac28/monitor-light-1024x600.jpg` | `YES` | Approved — no framing change requested. |
| `ac28/deck-dark-1440x900.jpg` | `YES` | Approved — no framing change requested. |
| `ac28/deck-light-1440x900.jpg` | `YES` | Approved — no framing change requested. |
| `ac28/deck-dark-1024x600.jpg` | `YES` | Approved — no framing change requested. |
| `ac28/deck-light-1024x600.jpg` | `YES` | Approved — no framing change requested. |
| `ac28/crate-dark-1440x900.jpg` | `YES` | Approved — no framing change requested. |
| `ac28/crate-light-1440x900.jpg` | `YES` | Approved — no framing change requested. |
| `ac28/crate-dark-1024x600.jpg` | `YES` | Approved — no framing change requested. |
| `ac28/crate-light-1024x600.jpg` | `YES` | Approved — no framing change requested. |

### AC-28 owner mark

- [x] `approved` — all twelve captures were reviewed and no framing change is
      requested.
- [ ] `changes-requested` — affected captures and requested changes are named
      below; Step 9 remains blocked.

Requested changes or `none`: none

## 4. Agent-preparation statement

The dated owner record must retain and complete this statement:

> Agents prepared the Phase 5 implementation, this template, automated test
> evidence, and the twelve AC-28 screenshots. Agents did not perform or
> certify the AC-27 hardware review and did not approve AC-28. I made the
> marks and decision recorded here.

- Owner typed name: `Alex Xiong`
- Owner ISO date/time: `2026-08-14T00:09:52-0400`
- Owner approval/signature statement: `Owner Approved`

## 5. Decision history — latest entry governs

Append one owner-authored row for every review. Do not delete or rewrite
earlier rows. `changes-requested` blocks acceptance until a later owner row in
this same dated file explicitly supersedes it with both marks approved.

| Owner ISO date/time | AC-27 (`pass`) | AC-28 (`approved`) | Overall (`approved`) | Supersedes | Owner name | Notes |
|---|---|---|---|---|---|---|
| 2026-08-14T00:13:52-0400 | pass | approved | approved | none | Alex Xiong | AC-27 traces passed; AC-28 captures approved; no changes requested. |

---

# Appendix

## A. Capture provenance

- All twelve AC-28 JPEGs listed in §3 are present at `ac28/` with exactly the
  expected filenames (verified 2026-08-13; captured 2026-08-13 20:54–20:57
  local per file timestamps).
- They are deterministic development captures using seed
  `ax-cockpit-phase5-fit-v1`, `timeMs = 12000`, and paused ambient motion,
  with each mode settled and the deck record landed; each JPEG was verified at
  its filename-declared full-viewport dimensions
  (`docs/phase-5-implementation.md` §8).
- Preparation-time working tree: branch
  `codex/diagnose-and-fix-ac-17-e2e-timeout` at commit `1d84475`, with the
  Step 8 Phase 5 diff intentionally uncommitted per decision D7.

Owner-only content no agent may supply: every `pass`/`fail`/`YES`/`NO` mark,
all feel/behavior and review notes, the tuning-response answers, the detented
wheel mouse identity and test host, the review date/time, and the §4
signature block.
