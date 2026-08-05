# Phase 3 DPR capture — owner-hardware-2026-08-02-r2

Status: **hardware measurements awaiting separate owner certification**

Raw capture: [owner-hardware-2026-08-02-r2.json](owner-hardware-2026-08-02-r2.json)

## Environment

- Captured: 2026-08-03T00:24:15.195Z
- Git commit: `c06793254ea2be814abd01dfb1a320a556c5ea2f` (dirty worktree: true)
- Browser: chrome 150.0.7871.187
- OS: darwin 25.5.0 arm64
- Host model: Mac16,7 / Apple M4 Pro
- Power: mains
- Appearance: dark
- Reduced motion: off
- Unmasked vendor: `Google Inc. (Apple)`
- Unmasked renderer: `ANGLE (Apple, ANGLE Metal Renderer: Apple M4 Pro, Unspecified Version)`
- Renderer classification: **hardware**

## Production build

- Next build id: `yq7ATLqNo34LvIH9Zza6M`
- Client JavaScript: 1.59 MiB
- Client CSS: 41.16 KiB
- All client static assets: 1.63 MiB
- Server app output: 1.16 MiB
- Build-log SHA-256: `16154599d31bb7e664bd8e8ca52ed2268ab8e21fc70493dd02d77f0f128b4daa`

## Measurements

Each cell warmed for 5 s and sampled requestAnimationFrame timestamps for 15 s. Record 0 is landed in deck view. FPS is an instantaneous-frame distribution, not an average-only figure.

| CSS viewport | View | Requested DPR | Observed DPR | Drawing buffer | Frame median ms | Frame p95 ms | Frame p99 ms | Frame max ms | FPS median | Calls median | Triangles median | Geometries | Textures | JS heap bytes |
|---|---|---:|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1440×900 | cockpit | 1 | 1 | 1440×900 | 8.3 | 8.9 | 9.3 | 25 | 120.482 | 878 | 178992 | 524 | 58 | 37156584 |
| 1440×900 | crate | 1 | 1 | 1440×900 | 8.3 | 8.9 | 9.3 | 25.7 | 120.482 | 448 | 80078 | 537 | 61 | 34463791 |
| 1440×900 | deck | 1 | 1 | 1440×900 | 8.3 | 8.5 | 9.3 | 9.4 | 120.482 | 731 | 141652 | 542 | 63 | 35259388 |
| 1512×982 | cockpit | 1 | 1 | 1512×982 | 8.3 | 9.1 | 9.3 | 9.4 | 120.482 | 828 | 157756 | 393 | 54 | 31664840 |
| 1512×982 | crate | 1 | 1 | 1512×982 | 8.3 | 8.7 | 9.3 | 9.4 | 120.482 | 440 | 79238 | 451 | 59 | 29411184 |
| 1512×982 | deck | 1 | 1 | 1512×982 | 8.3 | 16.6 | 17.231 | 33.7 | 120.482 | 719 | 139292 | 456 | 61 | 43163319 |
| 3440×1440 | cockpit | 1 | 1 | 3440×1440 | 16.6 | 17.1 | 17.6 | 41.6 | 60.241 | 958 | 198914 | 464 | 60 | 33296773 |
| 3440×1440 | crate | 1 | 1 | 3440×1440 | 8.4 | 16.8 | 17.4 | 41.6 | 119.048 | 492 | 87598 | 498 | 63 | 37499136 |
| 3440×1440 | deck | 1 | 1 | 3440×1440 | 16.6 | 17 | 17.6 | 49.5 | 60.241 | 900 | 175710 | 505 | 65 | 40975498 |
| 3840×2160 | cockpit | 1 | 1 | 3840×2160 | 16.7 | 25.1 | 25.8 | 58.3 | 59.88 | 899 | 176138 | 428 | 57 | 55637755 |
| 3840×2160 | crate | 1 | 1 | 3840×2160 | 16.7 | 25 | 25.5 | 58.3 | 59.88 | 459 | 83118 | 475 | 61 | 24998287 |
| 3840×2160 | deck | 1 | 1 | 3840×2160 | 16.7 | 25.1 | 25.8 | 58.4 | 59.88 | 774 | 149700 | 480 | 63 | 22145181 |
| 1440×900 | cockpit | 2 | 2 | 2880×1800 | 15.9 | 17.1 | 17.6 | 41.6 | 62.893 | 900 | 167504 | 479 | 56 | 35268041 |
| 1440×900 | crate | 2 | 2 | 2880×1800 | 8.4 | 16.7 | 17.147 | 49.9 | 119.048 | 448 | 80078 | 530 | 61 | 33252998 |
| 1440×900 | deck | 2 | 2 | 2880×1800 | 15.7 | 17.1 | 17.6 | 33.4 | 63.694 | 733 | 142204 | 535 | 63 | 48260123 |
| 1512×982 | cockpit | 2 | 2 | 3024×1964 | 16.6 | 17.1 | 17.6 | 58.3 | 60.241 | 828 | 157756 | 393 | 54 | 29660690 |
| 1512×982 | crate | 2 | 2 | 3024×1964 | 15.8 | 17.3 | 17.6 | 50.8 | 63.291 | 440 | 79238 | 451 | 59 | 30465506 |
| 1512×982 | deck | 2 | 2 | 3024×1964 | 16.6 | 17.4 | 24.838 | 50 | 60.241 | 719 | 139292 | 456 | 61 | 33665735 |
| 3440×1440 | cockpit | 2 | 2 | 6880×2880 | 41.1 | 42.42 | 50 | 124.1 | 24.331 | 958 | 198914 | 464 | 60 | 37975242 |
| 3440×1440 | crate | 2 | 2 | 6880×2880 | 33.2 | 34.3 | 41.709 | 108.2 | 30.12 | 492 | 87598 | 498 | 63 | 52055941 |
| 3440×1440 | deck | 2 | 2 | 6880×2880 | 41.7 | 42.5 | 50 | 133.4 | 23.981 | 900 | 175710 | 505 | 65 | 32369083 |
| 3840×2160 | cockpit | 2 | 2 | 7680×4320 | 58.3 | 66.7 | 67.378 | 175 | 17.153 | 899 | 176138 | 428 | 57 | 43097216 |
| 3840×2160 | crate | 2 | 2 | 7680×4320 | 49.6 | 50.1 | 50.872 | 141.6 | 20.161 | 459 | 83118 | 475 | 61 | 39726591 |
| 3840×2160 | deck | 2 | 2 | 7680×4320 | 58.3 | 59.28 | 66.7 | 183.3 | 17.153 | 774 | 149700 | 480 | 63 | 49547546 |

## Decision boundary

The script records measurements but cannot certify ownership or decide DPR_CAP. Eligibility requires the separate owner checkpoint record and the approved §5.4 comparison.

This capture does not certify the owner hardware run or the one-time
`about:gpucrash` recovery check. See `OWNER-CHECKPOINT.template.md`.
