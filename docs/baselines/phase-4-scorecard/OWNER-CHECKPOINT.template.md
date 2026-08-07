# Phase 4 hardware scorecard — owner checkpoint template

Status: **INCOMPLETE — TEMPLATE ONLY**

This checkpoint is completed and signed only by the portfolio owner after a
headed, real-Chrome hardware capture on mains power. Agents may prepare this
template but must not run, certify, or sign the owner hardware capture.

## Capture identity

- Capture file:
- Summary file:
- Capture date (UTC):
- Git commit:
- `git.dirty: false` confirmed:
- Browser and version:
- OS and version:
- Hardware model:
- Power source (must be mains):
- Unmasked WebGL vendor:
- Unmasked WebGL renderer:
- Renderer classification (`hardware` required):

## Protocol confirmation

- [ ] Captured from a clean checkout of the committed Phase 4 harness.
- [ ] Used `seed = "ax-cockpit-phase4-v1"` and `timeMs = 12000`.
- [ ] Used the full 24-cell matrix and three fresh-page repeats per cell.
- [ ] The harness ran strictly serially and not concurrently with e2e.
- [ ] Required font descriptors loaded before scene construction.
- [ ] Every cell reached `getVisualAssetState().pending === 0`.
- [ ] Every cell reported zero failed visual assets.
- [ ] Every cell passed the blank-canvas precondition.
- [ ] Every cell recorded zero unexpected console/page/network diagnostics.
- [ ] The renderer identity is hardware and was not compared with SwiftShader.
- [ ] Both themes and cockpit/crate/deck views were visually spot-checked.

## Owner decision

- [ ] APPROVED
- [ ] REJECTED — investigation required

Notes:

Owner name:

Owner signature/approval statement:

Approval timestamp (UTC):
