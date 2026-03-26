# Light Mode Chinese-Brutalist Visual Style Guide

This global style guide enforces the strict aesthetic requirements for the Portfolio 3.0 frontend. All agents adjusting CSS, UI components, or design architecture must adhere strictly to these rules.

## Global Aesthetic
- **Theme**: A fusion of Chinese cultural colors (jade green, vermilion red) paired with Eastern brutalism (concrete grid backgrounds, rigid structural layouts) and terminal-style framing (Marathon-inspired structure, but strictly **LIGHT MODE**).
- **Vibe**: Light, bright, tactical, and aggressively structural. A clean paper/parchment base with stark black ink and brilliant red lines. 

## Color Palette (Strict Adherence)
- **Background (`--background`)**: `#F4F1E8` (Pale parchment / warm off-white paper base)
- **Foreground (`--foreground`)**: `#1A1A1A` (Deep structural ink black)
- **Primary / Accent 1 (`--primary`)**: `#C91D22` (Chinese Crimson/Vermilion) - Usage: headers, extreme highlights, structural borders, primary interactive elements.
- **Secondary / Accent 2 (`--secondary`)**: `#4B6E4F` (Muted Jade Green) - Usage: tech accents, secondary data points, success states, subtle background glows.
- **Surfaces/Cards (`--card`, `--popover`)**: `#E8E5DC` (Slightly darker tan paper for contrast against the main background)
- **Borders (`--border`)**: `#1A1A1A` (Aggressive, thick black ink lines to enforce brutalism)

## Typography Constraints
- **Primary Font**: `VCR_OSD_MONO` (For massive structural text, numbers, metrics, terminal printouts)
- **Secondary Font**: `SpaceMono` (For readable paragraph/body text and standard UI labels)
- **Execution**:
  - Text should occasionally utilize vertical writing modes (`writing-mode: vertical-rl`) to mimic Eastern seal/stamping layouts.
  - Brutal typography: Heavy font weights, absolutely massive headings (e.g., `text-6xl`, `font-black`).

## UI Elements & CSS Structural Rules
- **Shadows**: Shadows must be stark, solid ink blocks (e.g., `shadow-[6px_6px_0px_#1a1a1a]`). NO soft alpha-blurs.
- **Borders**: Sharp 90-degree corners ONLY (`rounded-none`). Thick solid lines (`border-2`, `border-4` or `border-[6px]`).
- **Tech Features**: ALWAYS utilize `CyberButton` from `@/components/ui/cyber-button` where possible for interactive button elements instead of rolling vanilla buttons. This component handles brutalist Framer Motion states seamlessly.
