# Phase 3 DPR capture — owner-hardware-2026-08-02

Status: **hardware measurements awaiting separate owner certification**

Raw capture: [owner-hardware-2026-08-02.json](owner-hardware-2026-08-02.json)

## Environment

- Captured: 2026-08-02T23:01:51.019Z
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
| 1440×900 | cockpit | 1 | 1 | 1440×900 | 8.3 | 8.9 | 9.3 | 10.6 | 120.482 | 867 | 160472 | 420 | 54 | 34756891 |
| 1440×900 | crate | 1 | 1 | 1440×900 | 8.3 | 8.7 | 9.2 | 9.4 | 120.482 | 448 | 80078 | 476 | 60 | 27055944 |
| 1440×900 | deck | 1 | 1 | 1440×900 | 8.3 | 8.8 | 9.3 | 9.4 | 120.482 | 731 | 141652 | 481 | 62 | 42790345 |
| 1512×982 | cockpit | 1 | 1 | 1512×982 | 8.3 | 9.2 | 9.3 | 9.4 | 120.482 | 828 | 157756 | 393 | 54 | 31178986 |
| 1512×982 | crate | 1 | 1 | 1512×982 | 8.3 | 9.2 | 9.3 | 10.5 | 120.482 | 440 | 79238 | 455 | 59 | 41030640 |
| 1512×982 | deck | 1 | 1 | 1512×982 | 8.3 | 8.9 | 9.3 | 10.6 | 120.482 | 722 | 140470 | 460 | 61 | 48660257 |
| 3440×1440 | cockpit | 1 | 1 | 3440×1440 | 8.4 | 16.7 | 17.5 | 25 | 119.048 | 958 | 198914 | 464 | 60 | 39766388 |
| 3440×1440 | crate | 1 | 1 | 3440×1440 | 8.3 | 9.1 | 9.3 | 9.4 | 120.482 | 492 | 87598 | 498 | 63 | 31443483 |
| 3440×1440 | deck | 1 | 1 | 3440×1440 | 8.4 | 16.7 | 17.449 | 34.6 | 119.048 | 900 | 175710 | 505 | 65 | 27514655 |
| 3840×2160 | cockpit | 1 | 1 | 3840×2160 | 16.6 | 17.5 | 33.922 | 100 | 60.241 | 783 | 166966 | 481 | 61 | 54886039 |
| 3840×2160 | crate | 1 | 1 | 3840×2160 | 8.9 | 17.1 | 17.6 | 42.1 | 112.36 | 459 | 83118 | 481 | 61 | 37985824 |
| 3840×2160 | deck | 1 | 1 | 3840×2160 | 16.6 | 17.3 | 17.6 | 50.1 | 60.241 | 775 | 149318 | 486 | 63 | 43903125 |
| 1440×900 | cockpit | 2 | 2 | 2880×1800 | 8.4 | 16.8 | 17.6 | 33.3 | 119.048 | 885 | 166440 | 443 | 54 | 37693084 |
| 1440×900 | crate | 2 | 2 | 2880×1800 | 8.4 | 105.045 | 111.327 | 386.9 | 119.048 | 448 | 80078 | 495 | 60 | 31821779 |
| 1440×900 | deck | 2 | 2 | 2880×1800 | 96.45 | 111.225 | 116.425 | 173.2 | 10.368 | 731 | 141652 | 500 | 62 | 30289438 |
| 1512×982 | cockpit | 2 | 2 | 3024×1964 | 87 | 110.055 | 136.42 | 161.6 | 11.494 | 828 | 157756 | 393 | 54 | 44046453 |
| 1512×982 | crate | 2 | 2 | 3024×1964 | 86.4 | 108.85 | 110.225 | 111.4 | 11.574 | 440 | 79238 | 451 | 59 | 42197379 |
| 1512×982 | deck | 2 | 2 | 3024×1964 | 88.4 | 109.49 | 115.428 | 200.5 | 11.312 | 719 | 139292 | 456 | 61 | 26355174 |
| 3440×1440 | cockpit | 2 | 2 | 6880×2880 | 91.75 | 111.2 | 117.955 | 121.1 | 10.9 | 958 | 198914 | 464 | 60 | 34836475 |
| 3440×1440 | crate | 2 | 2 | 6880×2880 | 39.8 | 108.41 | 110.71 | 299.9 | 25.126 | 492 | 87598 | 498 | 63 | 36837161 |
| 3440×1440 | deck | 2 | 2 | 6880×2880 | 33.4 | 42.945 | 49.1 | 95.8 | 29.94 | 901 | 178588 | 505 | 65 | 53659512 |
| 3840×2160 | cockpit | 2 | 2 | 7680×4320 | 50 | 55.7 | 58.492 | 150 | 20 | 899 | 176138 | 428 | 57 | 42568225 |
| 3840×2160 | crate | 2 | 2 | 7680×4320 | 66 | 110.6 | 209.409 | 329.9 | 15.152 | 459 | 83118 | 475 | 61 | 35731806 |
| 3840×2160 | deck | 2 | 2 | 7680×4320 | 50.6 | 101.44 | 110.252 | 217.5 | 19.763 | 777 | 149534 | 480 | 63 | 47000392 |

## Decision boundary

The script records measurements but cannot certify ownership or decide DPR_CAP. Eligibility requires the separate owner checkpoint record and the approved §5.4 comparison.

This capture does not certify the owner hardware run or the one-time
`about:gpucrash` recovery check. See `OWNER-CHECKPOINT.template.md`.
