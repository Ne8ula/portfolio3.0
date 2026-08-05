# AC-23 owner checkpoint — template, not completed evidence

Status: **COMPLETE - OWNER CERTIFIED AND APPROVED**

Do not treat this template as a hardware capture, an `about:gpucrash` result,
or owner certification. After fresh independent Kimi QA passes Step 7, the
owner runs the procedure below, replaces every placeholder, changes the
status, and saves the completed record without using Codex to self-certify it.

## 1. Hardware production capture

- Owner name or identifier: Alex Xiong (Ne8ula)
- Capture date/time and time zone: 2026-08-02, 8:24 PM EDT (America/New_York;
  2026-08-03T00:24:15.195Z)
- Capture files (`owner-hardware-*.json` and `.md`):
  `owner-hardware-2026-08-02-r2.json`, `owner-hardware-2026-08-02-r2.md`
- Git commit: `c06793254ea2be814abd01dfb1a320a556c5ea2f` (dirty worktree)
- Browser and version: Chrome 150.0.7871.187
- OS and version: macOS 26.5.2 (Darwin 25.5.0, arm64)
- Hardware model: MacBook Pro (Mac16,7), Apple M4 Pro, 24 GB
- GPU: Apple M4 Pro (integrated)
- Power state (`mains` or `battery`): `mains`
- Appearance (`dark` or `light`): `dark`
- Reduced motion: `off`
- Unmasked vendor: `Google Inc. (Apple)`
- Unmasked renderer: `ANGLE (Apple, ANGLE Metal Renderer: Apple M4 Pro, Unspecified Version)`
- Script completed all 24 cells: `YES`
- Renderer is hardware, not SwiftShader/software: `YES`

Run the hardware command from `README.md` against one production build. Check
that the generated JSON and Markdown name the same environment and unmasked
renderer shown above. A successful script run is necessary but does not by
itself certify the evidence; the owner completes this section.

## 2. One-time real GPU-process recovery check

Use branded desktop Chrome on the same hardware environment. Playwright's
`WEBGL_lose_context` extension test is not a substitute for this procedure.

1. Start the same production build with `npm run start` and open the site in
   Chrome.
2. Enter the cockpit and choose a stable starting state. Record the starting
   view and, for deck view, the record index.
3. Keep that site tab visible. Open a second Chrome tab, type
   `about:gpucrash` in the address bar, and confirm navigation. Chrome should
   terminate and restart its GPU process.
4. Return to the site tab. Observe the transient recovery status, then verify
   that the cockpit renders again without reloading the page and returns to
   the last stable view at rest. A deck start must return landed at rest with
   the same record, never mid-animation.
5. Verify that ordinary `View projects` and `About` routes remain available.
   If recovery reaches the terminal notice instead, record that actual result
   and mark the check failed; do not reinterpret it as a pass.
6. Record the result below. Do not repeat the crash merely to manufacture a
   passing observation; investigate any failure in a separate engineering
   pass.

- Test date/time and time zone: 2026-08-02, 8:33 PM EDT (America/New_York)
- Chrome version: 150.0.7871.187
- Starting view: cockpit (base free-look)
- Starting record index, if deck: N/A
- Recovery status became visible: YES
- Rendering returned without page reload: YES
- Restored view/record matched at rest: YES — returned to the base cockpit
  view at rest; no record was playing (deck not in use)
- Canonical route links remained available: YES
- Terminal notice observed: NO
- Result: PASS

## 3. Owner certification and DPR_CAP decision

The owner compares only the hardware `1512×982` crate and deck cells. A
SwiftShader result can never be used here.

- Crate DPR 1 median / p95: 8.3 ms / 8.7 ms
- Crate DPR 2 median / p95: 15.8 ms / 17.3 ms
- Deck DPR 1 median / p95: 8.3 ms / 16.6 ms
- Deck DPR 2 median / p95: 16.6 ms / 17.4 ms
- Approved decision: retain DPR_CAP = 2
- Decision date: 2026-08-02

Owner certification:

> I certify that I ran the named hardware capture and the one-time
> `about:gpucrash` procedure on the environment recorded above, reviewed the
> resulting evidence, and made the stated DPR_CAP decision.

- Owner signature or recorded approval reference: `Alex Xiong - owner approved 2026-08-03`
