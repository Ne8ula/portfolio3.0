# Vinyl sleeve extraction and return

**Status:** Owner-approved implementation direction (2026-08-02)

## Problem

The crate previously represented every record jacket with one closed
`BoxGeometry`. Its top face visually sealed the jacket, so the record appeared
to pass through printed cardboard when it left or returned. The existing
record-to-deck Bézier also introduced lateral movement before the record's
lower edge had cleared that top boundary.

## Approved construction

Each jacket is an open shell:

- separate 0.006-unit front and back boards;
- 0.012-unit left, right, and bottom seams;
- no top seam or top cap;
- a 0.033-unit internal mouth gap around the 0.02-unit-thick record;
- unchanged cover artwork on the front board; and
- the former top-edge title moved to a raised rear registration lip, where it
  remains readable without covering the opening.

The front board, U-shaped shell, and rear lip are merged into one grouped mesh
per jacket. That preserves the physical parts while using fewer material draw
groups than the former closed six-face box.

The selected preview remains partly jacketed at a 0.52-unit rise. It is a
preview state, not a flight waypoint.

## Collision-free motion contract

The sleeve top is `0.49`, the record radius is `0.4508`, and the required
clearance margin is `0.025`. Therefore the record center must reach:

`0.49 + 0.4508 + 0.025 = 0.9658`

before lateral travel begins.

Departure uses two stages:

1. Extract along the live sleeve-local positive Y axis for 0.42 seconds, or
   immediately under reduced motion, until the record reaches the 0.9658
   clear-rise waypoint.
2. Begin the existing world-space Bézier toward the platter only after both
   the waypoint and dust-cover clearance are satisfied.

Return reverses the ownership boundary:

1. The deck flies the record to the same live clear-rise waypoint.
2. At that exact pose the crate copy becomes visible and lowers vertically
   through the open mouth. The sleeve does not translate laterally during
   insertion.

This is deterministic waypoint staging, not runtime physics. It prevents
intersections by construction while preserving the current camera, sleeve
selection, and `window.__cockpit*` bridge contracts.

## Acceptance criteria

- No jacket geometry closes the top opening.
- The jacket mouth is wider than the record thickness.
- A departing record cannot begin lateral travel before extraction reaches
  100% and its lower edge has 0.025 units of clearance.
- A returning record lands at the clear waypoint before vertical insertion.
- Reduced-motion mode preserves the same waypoints without the authored
  animation duration.
- Canonical project content and owner approval records remain unchanged.
- The dev-only additive test hook can report mouth dimensions, clearance, and
  whether lateral motion is currently allowed.
