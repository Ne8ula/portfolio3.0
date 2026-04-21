"use client"

import { Html } from "@react-three/drei"
import type { Project } from "@/lib/projects"

interface VinylHoverLabelProps {
  project: Project
  visible: boolean
}

// Floating drei <Html> label above the hovered vinyl. Ref3's hover-preview
// metaphor: title + `ex://project/<slug>` URL-tag caption. Warm-band colors
// only — the cold-electric band is transient/transition territory.
export function VinylHoverLabel({ project, visible }: VinylHoverLabelProps) {
  return (
    <Html
      position={[0, 0.78, 0]}
      center
      distanceFactor={2.2}
      zIndexRange={[30, 20]}
      style={{
        pointerEvents: "none",
        opacity: visible ? 1 : 0,
        transition: "opacity 160ms ease",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "4px",
          padding: "8px 12px",
          background: "#EDE6D3",
          border: "2px solid #1A1A1A",
          boxShadow: "4px 4px 0px #1A1A1A",
          whiteSpace: "nowrap",
        }}
      >
        <div
          style={{
            fontFamily: "VCR_OSD_MONO, monospace",
            fontSize: "16px",
            fontWeight: 900,
            color: "#1A1A1A",
            letterSpacing: "0.05em",
            lineHeight: 1,
          }}
        >
          {project.title}
        </div>
        <div
          style={{
            fontFamily: "VCR_OSD_MONO, monospace",
            fontSize: "10px",
            color: project.accentColor,
            letterSpacing: "0.15em",
            textTransform: "lowercase",
          }}
        >
          ex://project/{project.slug}
        </div>
      </div>
    </Html>
  )
}
