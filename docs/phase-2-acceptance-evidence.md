# Phase 2 acceptance evidence

Status: implementation complete; port-enabled browser gate and independent
Kimi review pending. This record maps the approved criteria in
`docs/phase-2-design.md` §9 to executable checks and review artifacts without
claiming independent QA.

## Automated evidence

| Criteria | Evidence |
|---|---|
| AC-1–AC-5 | `e2e/phase2-completion.spec.ts` tier-1 response, reflow, no-JS control-shell, and visible-semantic-text checks over `/`, `/projects`, all six detail routes, and `/about` |
| AC-2 redirect | `e2e/phase2-completion.spec.ts` asserts `/recruiter` returns 308 with `Location: /about`; `e2e/smoke.spec.ts` now passes on initial `/projects` + `/about` links |
| AC-6 | `e2e/phase2-boundary.spec.ts` blocks WebGL and checks the operable non-inert document plus unavailable notice |
| AC-7–AC-8 | `e2e/phase2-completion.spec.ts` persists/resets accessibility and appearance together and traverses every implemented parity outcome; `tests/unit/action-parity.test.ts` pins the future-stub label |
| AC-9–AC-12 | Existing smoke checks plus `e2e/phase2-boundary.spec.ts` cover boot/stage/render, shared real navigation, native `VIEW MORE`, and inert handoff |
| AC-13 | The Phase 6 deck-overlap `test.fixme` remains present in `e2e/smoke.spec.ts`; no overlap implementation changed |
| AC-14–AC-16 | `npm run validate:contracts`, `tests/unit/content-contracts.test.ts`, and `tests/unit/layout-contracts.test.ts`; the explicit approved route inventory yields 5 registered layout contracts and 5 covered routes |
| AC-17 | `tests/unit/document-foundations.test.ts` pins the scroll-lock thresholds to `normalMin - 1` |
| AC-18 | `tests/unit/discovery.test.ts` checks the exact sitemap set and robots declaration |
| AC-19–AC-20b | `tests/unit/serializers.test.ts` checks canonical URLs, approval-field exclusion, one public schema version, visible-model/JSON-LD parity, and ordered About prose |
| AC-21 | `tests/unit/navigation.test.ts` checks every internal `SITE_NAV` route has a content contract; `validateActionParity()` is both unit-tested and part of `validate:contracts` |
| AC-22 | `tests/unit/import-boundary.test.ts` executes ESLint against forbidden `three`/cockpit imports and the sole `app/page.tsx` allowance. The implementation handoff records the temporary-file lint failure demonstration. |
| AC-23–AC-29 | `e2e/phase2-completion.spec.ts` runs a semantic accessibility audit in both appearances, heading/landmark checks, focus targets, target-size checks at both control sizes, contrast math, forced-colors structure, and reduced-motion animation checks |
| AC-35 | `tests/unit/serializers.test.ts` and the Step 3 browser evidence cover host classification/self-link suppression; the Step 3 QA handoff records all six legacy 308 checks |

AC-14 in the approved design says “6 layout contracts,” while its route
inventory and registry specify five: `cockpit-v1`, `projects-index-v1`,
`project-detail-v1`, `about-v1`, and `responsive-preview-v1`. No sixth
contract was invented. This discrepancy is explicit for Kimi/owner review.

## Manual and saved-artifact evidence

The port-enabled `npm run test:e2e` gate writes ignored, reproducible review
artifacts under `test-results/phase-2-evidence/`:

- `home-{light,dark}-{1440x900,320x568}.png`
- `projects-{light,dark}-{1440x900,320x568}.png`
- `projects-songofmaka-{light,dark}-{1440x900,320x568}.png`
- `about-{light,dark}-{1440x900,320x568}.png`
- `about-print.pdf`

Manual review checklist for those artifacts and the live routes:

- AC-30: complete `/`, `/projects`, one detail route, and `/about` by
  keyboard; confirm visible unobscured focus, skip-link transfer, primary
  navigation, previous/next links, and no trap.
- AC-31: inspect `about-print.pdf` for one column, expanded external URLs,
  absent fixed chrome, and no project split across a page.
- AC-32: inspect every route against `DESIGN.md` §15: cream/ink/mauve/jade
  only, square interface geometry, no DOM drop shadow, role-based type,
  readable measure, and catalogue hierarchy.
- AC-33: reconcile visible facts/actions against `PROFILE`, `PROJECTS`,
  `SITE_NAV`, and `ACTION_PARITY`; no unique cockpit/texture/hover-only fact.
- AC-34: inspect all sixteen screenshots for both appearances and both
  required viewport sizes.

The current Codex sandbox cannot bind localhost (`listen EPERM`), so the
manual artifact inspection remains intentionally unclaimed here. The trusted
phase controller runs the fixed E2E command outside that sandbox before Kimi
QA; Kimi must reject the phase if the artifacts are missing or any manual
check fails.
