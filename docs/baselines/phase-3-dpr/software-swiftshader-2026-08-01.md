# Phase 3 DPR capture — software-swiftshader-2026-08-01

Status: **software evidence only — not decision-eligible**

Raw capture: [software-swiftshader-2026-08-01.json](software-swiftshader-2026-08-01.json)

## Environment

- Captured: 2026-08-02T02:26:14.759Z
- Git commit: `3f143039635e9517b58236c8d74dce5d9038303b` (dirty worktree: true)
- Browser: playwright-chromium 151.0.7922.34
- OS: darwin 25.5.0 arm64
- Host model: Mac16,7 / Apple M4 Pro
- Power: battery
- Appearance: dark
- Reduced motion: off
- Unmasked vendor: `Google Inc. (Google)`
- Unmasked renderer: `ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (LLVM 10.0.0) (0x0000C0DE)), SwiftShader driver)`
- Renderer classification: **software**

## Production build

- Next build id: `vHyLAmUYD3L6qXAAF0sJY`
- Client JavaScript: 1.59 MiB
- Client CSS: 41.11 KiB
- All client static assets: 1.63 MiB
- Server app output: 1.16 MiB
- Build-log SHA-256: `49cb838f350a6fd23e742dafe2520ed52f58f62beb100be97d5cd2e968819afa`

## Measurements

Each cell warmed for 5 s and sampled requestAnimationFrame timestamps for 15 s. Record 0 is landed in deck view. FPS is an instantaneous-frame distribution, not an average-only figure.

| CSS viewport | View | Requested DPR | Observed DPR | Drawing buffer | Frame median ms | Frame p95 ms | Frame p99 ms | Frame max ms | FPS median | Calls median | Triangles median | Geometries | Textures | JS heap bytes |
|---|---|---:|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1440×900 | cockpit | 1 | 1 | 1440×900 | 433.4 | 459.63 | 750.163 | 916.7 | 2.307 | 886 | 162176 | 402 | 54 | 23100000 |
| 1440×900 | crate | 1 | 1 | 1440×900 | 275 | 313.4 | 473.348 | 566.7 | 3.636 | 443 | 73666 | 440 | 58 | 23100000 |
| 1440×900 | deck | 1 | 1 | 1440×900 | 416.7 | 434.15 | 712.926 | 879.1 | 2.4 | 779 | 144870 | 447 | 61 | 23100000 |
| 1512×982 | cockpit | 1 | 1 | 1512×982 | 483.4 | 514.53 | 876.7 | 1041.7 | 2.069 | 874 | 158236 | 397 | 54 | 24500000 |
| 1512×982 | crate | 1 | 1 | 1512×982 | 316.6 | 325.1 | 492.2 | 658.4 | 3.159 | 441 | 71618 | 436 | 57 | 24500000 |
| 1512×982 | deck | 1 | 1 | 1512×982 | 450 | 518.7 | 790.46 | 933.4 | 2.222 | 759 | 141454 | 443 | 60 | 24500000 |
| 3440×1440 | cockpit | 1 | 1 | 3440×1440 | 1274.9 | 1766.76 | 2653.352 | 2875 | 0.784 | 996 | 198338 | 465 | 60 | 21700000 |
| 3440×1440 | crate | 1 | 1 | 3440×1440 | 850.1 | 941.7 | 1634.98 | 1808.3 | 1.176 | 472 | 78978 | 483 | 61 | 21700000 |
| 3440×1440 | deck | 1 | 1 | 3440×1440 | 1658.2 | 2978.22 | 4542.204 | 4933.2 | 0.603 | 945 | 184152 | 490 | 64 | 21700000 |
| 3840×2160 | cockpit | 1 | 1 | 3840×2160 | 2104.1 | 3886.995 | 4330.839 | 4441.8 | 0.475 | 937 | 178418 | 429 | 57 | 19300000 |
| 3840×2160 | crate | 1 | 1 | 3840×2160 | 1466.7 | 2148.705 | 3063.021 | 3291.6 | 0.682 | 455 | 75534 | 457 | 58 | 19300000 |
| 3840×2160 | deck | 1 | 1 | 3840×2160 | 2195.75 | 3468.735 | 4293.747 | 4500 | 0.455 | 829 | 152994 | 462 | 61 | 19300000 |
| 1440×900 | cockpit | 2 | 2 | 2880×1800 | 1308.3 | 1802.08 | 2467.136 | 2633.4 | 0.764 | 886 | 162176 | 402 | 54 | 20500000 |
| 1440×900 | crate | 2 | 2 | 2880×1800 | 907.7 | 919.54 | 950.548 | 958.3 | 1.102 | 443 | 73666 | 439 | 58 | 20500000 |
| 1440×900 | deck | 2 | 2 | 2880×1800 | 1429.15 | 2209.49 | 2891.418 | 3061.9 | 0.7 | 779 | 144870 | 444 | 61 | 20500000 |
| 1512×982 | cockpit | 2 | 2 | 3024×1964 | 1541.7 | 2272.82 | 2981.204 | 3158.3 | 0.649 | 874 | 158236 | 397 | 54 | 19300000 |
| 1512×982 | crate | 2 | 2 | 3024×1964 | 1245.85 | 1285.325 | 1290.425 | 1291.7 | 0.803 | 441 | 71618 | 436 | 57 | 19300000 |
| 1512×982 | deck | 2 | 2 | 3024×1964 | 1404.15 | 2053.105 | 2887.341 | 3095.9 | 0.712 | 759 | 141454 | 441 | 60 | 19300000 |
| 3440×1440 | cockpit | 2 | 2 | 6880×2880 | 4066.7 | 7126.45 | 8138.41 | 8391.4 | 0.246 | 996 | 198338 | 465 | 60 | 19300000 |
| 3440×1440 | crate | 2 | 2 | 6880×2880 | 2983.3 | 5755.985 | 6932.237 | 7226.3 | 0.335 | 472 | 78978 | 483 | 61 | 19300000 |
| 3440×1440 | deck | 2 | 2 | 6880×2880 | 5537.4 | 13750 | 15930 | 16475 | 0.181 | 945 | 184152 | 490 | 64 | 19300000 |
| 3840×2160 | cockpit | 2 | 2 | 7680×4320 | 7466.6 | 13768.18 | 15026.836 | 15341.5 | 0.134 | 937 | 178418 | 429 | 57 | 24500000 |
| 3840×2160 | crate | 2 | 2 | 7680×4320 | 5308.25 | 12637.4 | 14554.04 | 15033.2 | 0.188 | 455 | 75534 | 457 | 58 | 24500000 |
| 3840×2160 | deck | 2 | 2 | 7680×4320 | 7758.2 | 20366.5 | 22873.14 | 23499.8 | 0.129 | 829 | 152994 | 462 | 61 | 24500000 |

## Decision boundary

SwiftShader/software measurements exercise the harness only and can never justify a DPR_CAP amendment. DPR_CAP remains pending the owner-certified hardware capture.

This capture does not certify the owner hardware run or the one-time
`about:gpucrash` recovery check. See `OWNER-CHECKPOINT.template.md`.
