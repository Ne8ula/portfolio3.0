# AC-23 owner checkpoint — template, not completed evidence

Status: **PENDING OWNER ACTION**

Do not treat this template as a hardware capture, an `about:gpucrash` result,
or owner certification. After fresh independent Kimi QA passes Step 7, the
owner runs the procedure below, replaces every placeholder, changes the
status, and saves the completed record without using Codex to self-certify it.

## 1. Hardware production capture

- Owner name or identifier: `[Alex Xiong]`
- Capture date/time and time zone: `[OWNER TO COMPLETE]`
- Capture files (`owner-hardware-*.json` and `.md`): `[OWNER TO COMPLETE]`
- Git commit: `[OWNER TO COMPLETE]`
- Browser and version: `[OWNER TO COMPLETE]`
- OS and version: `[OWNER TO COMPLETE]`
- Hardware model: `[OWNER TO COMPLETE]`
- GPU: `[OWNER TO COMPLETE]`
- Power state (`mains` or `battery`): `[OWNER TO COMPLETE]`
- Appearance (`dark` or `light`): `[OWNER TO COMPLETE]`
- Reduced motion: `off`
- Unmasked vendor: `[OWNER TO COMPLETE]`
- Unmasked renderer: `[OWNER TO COMPLETE]`
- Script completed all 24 cells: `[OWNER YES/NO]`
- Renderer is hardware, not SwiftShader/software: `[OWNER YES/NO]`

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

- Test date/time and time zone: `[OWNER TO COMPLETE]`
- Chrome version: `[OWNER TO COMPLETE]`
- Starting view: `[OWNER TO COMPLETE]`
- Starting record index, if deck: `[OWNER TO COMPLETE OR N/A]`
- Recovery status became visible: `[OWNER YES/NO]`
- Rendering returned without page reload: `[OWNER YES/NO]`
- Restored view/record matched at rest: `[OWNER YES/NO + DETAILS]`
- Canonical route links remained available: `[OWNER YES/NO]`
- Terminal notice observed: `[OWNER YES/NO]`
- Result: `[OWNER PASS/FAIL]`
- Notes or evidence links: `[OWNER TO COMPLETE]`

## 3. Owner certification and DPR_CAP decision

The owner compares only the hardware `1512×982` crate and deck cells. A
SwiftShader result can never be used here.

- Crate DPR 1 median / p95: `[OWNER TO COMPLETE]`
- Crate DPR 2 median / p95: `[OWNER TO COMPLETE]`
- Deck DPR 1 median / p95: `[OWNER TO COMPLETE]`
- Deck DPR 2 median / p95: `[OWNER TO COMPLETE]`
- Approved decision (`retain DPR_CAP = 2` or amendment requested):
  `[OWNER TO COMPLETE]`
- Decision date: `[OWNER TO COMPLETE]`

Owner certification:

> I certify that I ran the named hardware capture and the one-time
> `about:gpucrash` procedure on the environment recorded above, reviewed the
> resulting evidence, and made the stated DPR_CAP decision.

- Owner signature or recorded approval reference: `[OWNER TO COMPLETE]`
