# Phase 0 baseline — recorded current failures

Captured 2026-07-28T01:21:48.431Z against the pre-responsive cockpit.
Screenshots in this directory are for human review only — never pixel
baselines (§9.6.3 scorecard baselines wait for Phase 4 determinism).

## Deck browse-hint ↔ holographic card overlap (fixed in Phase 6)

The hint is viewport-anchored (`top: 76`) while the card is
projection-driven, so their separation has no invariant (plan §2.1).
Measured with `__COCKPIT_TEST_HOOKS__.getHudSnapshot()` in deck view:

| Viewport | Hint rect (x,y,w,h) | Card rect (x,y,w,h) | Overlaps |
|---|---|---|---|
| 1024×600 | 382,76,260,32 | 394,60,235,265 | true |
| 1024×768 | 382,76,260,32 | 361,73,302,340 | true |
| 1280×720 | 510,76,260,32 | 499,69,283,319 | true |
| 1280×800 | 510,76,260,32 | 483,82,313,352 | true |
| 1366×650 | 553,76,260,32 | 555,61,256,288 | true |
| 1366×768 | 553,76,260,32 | 532,73,302,340 | true |
| 1440×900 | 590,76,260,32 | 544,93,352,396 | true |
| 1512×982 | 626,76,260,32 | 563,98,385,433 | true |
| 1920×1080 | 830,76,260,32 | 749,111,423,476 | false |
| 2048×1536 | 894,76,260,32 | 723,156,602,677 | false |
| 2560×1440 | 1150,76,260,32 | 998,148,564,634 | false |
| 3440×1440 | 1590,76,260,32 | 1438,148,564,634 | false |
| 800×450 | 270,76,260,32 | 312,43,177,199 | true |
| 683×325 | 212,76,260,32 | 278,33,127,143 | true |
| 512×300 | 128,76,256,45 | 197,28,118,133 | true |
| 320×568 | 80,76,160,45 | 48,52,223,252 | true |
| 3840×2160 | 1790,76,260,32 | 1497,223,845,950 | false |

**12 of 17 viewports overlap today.**
Tracked as `test.fixme` in e2e/smoke.spec.ts, linked to Phase 6.

## Other known-current behavior recorded at capture time

- Below ~1024×600 the cockpit has NO zoom/narrow tier yet: the stage
  simply shrinks; HUD chrome overlaps content (Phase 1/5 work).
- Reduced motion does not reach the boot timelines (§A.6.2, Phase 1).
- No WebGL context-loss handling (§10.1, Phase 3).
