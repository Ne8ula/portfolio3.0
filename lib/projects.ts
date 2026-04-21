export type ProjectCategory = "designs" | "games" | "prototypes"

export interface Project {
  id: string
  slug: string
  title: string
  category: ProjectCategory
  year: number
  coverArt: string
  accentColor: string
  body: {
    summary: string
    highlights: string[]
    links: { label: string; href: string }[]
  }
}

// Warm-band palette only — cold-electric band is overlay/transient-only per
// .agents/rules/visual-style-guide.md. Accent tints the sleeve spine + cover
// inner square in the R3F vinyl.
const VERMILION = "#C91D22"
const JADE = "#4B6E4F"
const VERMILION_ORANGE = "#D94833"
const TAPE_YELLOW = "#D6B85A"

export const projects: Project[] = [
  {
    id: "design-01",
    slug: "design-01",
    title: "DESIGN_01",
    category: "designs",
    year: 2024,
    coverArt: "/assets/covers/design-01.svg",
    accentColor: VERMILION,
    body: {
      summary:
        "Brutalist identity system for an archival imprint — stamp grids, seal marks, and vertical-rl wayfinding.",
      highlights: [
        "20-page systems doc",
        "8 icon marks",
        "Typographic stamp set",
      ],
      links: [{ label: "OVERVIEW", href: "#" }],
    },
  },
  {
    id: "design-02",
    slug: "design-02",
    title: "DESIGN_02",
    category: "designs",
    year: 2024,
    coverArt: "/assets/covers/design-02.svg",
    accentColor: VERMILION_ORANGE,
    body: {
      summary:
        "Editorial layout study — rice-paper gradients, hand-set VCR_OSD_MONO pull-quotes.",
      highlights: ["Print + web variants", "16-up signature"],
      links: [{ label: "OVERVIEW", href: "#" }],
    },
  },
  {
    id: "design-03",
    slug: "design-03",
    title: "DESIGN_03",
    category: "designs",
    year: 2023,
    coverArt: "/assets/covers/design-03.svg",
    accentColor: JADE,
    body: {
      summary: "Micrographic wayfinding set for a live-service ops dashboard.",
      highlights: ["70+ SVG glyphs", "Operator console docs"],
      links: [{ label: "OVERVIEW", href: "#" }],
    },
  },
  {
    id: "design-04",
    slug: "design-04",
    title: "DESIGN_04",
    category: "designs",
    year: 2023,
    coverArt: "/assets/covers/design-04.svg",
    accentColor: TAPE_YELLOW,
    body: {
      summary: "Packaging exploration — kraft + vermilion + chop-mark foil.",
      highlights: ["3 SKUs", "Dieline + finishes"],
      links: [{ label: "OVERVIEW", href: "#" }],
    },
  },
  {
    id: "game-01",
    slug: "game-01",
    title: "GAME_01",
    category: "games",
    year: 2024,
    coverArt: "/assets/covers/game-01.svg",
    accentColor: VERMILION,
    body: {
      summary:
        "Isometric puzzle prototype — rotate rooms to align light shafts with a sleeping automaton.",
      highlights: ["14 rooms", "MeshToon pipeline", "Controller + keyboard"],
      links: [{ label: "OVERVIEW", href: "#" }],
    },
  },
  {
    id: "game-02",
    slug: "game-02",
    title: "GAME_02",
    category: "games",
    year: 2023,
    coverArt: "/assets/covers/game-02.svg",
    accentColor: JADE,
    body: {
      summary:
        "Two-button arcade loop about a paper courier dodging monsoon debris.",
      highlights: ["Ink-wash renderer", "Mobile + desktop", "Global leaderboard"],
      links: [{ label: "OVERVIEW", href: "#" }],
    },
  },
  {
    id: "game-03",
    slug: "game-03",
    title: "GAME_03",
    category: "games",
    year: 2022,
    coverArt: "/assets/covers/game-03.svg",
    accentColor: VERMILION_ORANGE,
    body: {
      summary:
        "Co-op typing roguelike — each room is a kanji phrase; mistakes summon glitch shards.",
      highlights: ["IME support", "Weekly run seeds"],
      links: [{ label: "OVERVIEW", href: "#" }],
    },
  },
  {
    id: "proto-01",
    slug: "proto-01",
    title: "PROTO_01",
    category: "prototypes",
    year: 2024,
    coverArt: "/assets/covers/proto-01.svg",
    accentColor: JADE,
    body: {
      summary:
        "MediaPipe egg-grip gesture → CSS-3D cube rotation. Same interaction model now powering this portfolio's hero.",
      highlights: ["Webcam-only input", "No external hardware"],
      links: [{ label: "OVERVIEW", href: "#" }],
    },
  },
  {
    id: "proto-02",
    slug: "proto-02",
    title: "PROTO_02",
    category: "prototypes",
    year: 2023,
    coverArt: "/assets/covers/proto-02.svg",
    accentColor: TAPE_YELLOW,
    body: {
      summary:
        "CRT-flicker React renderer — composable scanline + phosphor-decay primitives for retro UI.",
      highlights: ["Pure CSS, no WebGL", "<4kB gzip"],
      links: [{ label: "OVERVIEW", href: "#" }],
    },
  },
  {
    id: "proto-03",
    slug: "proto-03",
    title: "PROTO_03",
    category: "prototypes",
    year: 2022,
    coverArt: "/assets/covers/proto-03.svg",
    accentColor: VERMILION,
    body: {
      summary:
        "R3F field study — filing-box × vinyl-crate hybrid (the thing you're looking at now).",
      highlights: ["MeshToon throughout", "Zustand-driven view graph"],
      links: [{ label: "OVERVIEW", href: "#" }],
    },
  },
]

export const projectById = (id: string | null) =>
  id ? projects.find((p) => p.id === id) ?? null : null
