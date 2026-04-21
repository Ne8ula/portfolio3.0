"use client"

import type { Project } from "@/lib/projects"
import { useSceneStore } from "@/lib/store/scene-store"
import { CyberButton } from "@/components/ui/cyber-button"

// Rendered inside the CRT's <Html transform occlude> group. Styled as a
// jade-phosphor screen readout — warm-band accent tints inside the cold-
// electric shell to keep the cold band ≤12% of viewport per the style guide.
export function CrtProjectDetail({ project }: { project: Project }) {
  const eject = useSceneStore((s) => s.eject)

  return (
    <div
      className="relative flex flex-col bg-[#0e1a13] text-[#c6f2b2] font-mono select-none overflow-hidden"
      style={{ width: 820, height: 620, padding: 36 }}
    >
      {/* Scanline overlay — lives inside Html so it reads as "on the screen",
          not world-space. */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `repeating-linear-gradient(
            to bottom,
            rgba(0,0,0,0.22) 0px,
            rgba(0,0,0,0.22) 1px,
            transparent 1px,
            transparent 3px
          )`,
        }}
      />
      {/* Subtle screen curvature vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.55) 100%)",
        }}
      />

      {/* Header row */}
      <div className="flex items-start justify-between border-b-2 border-[#4B6E4F] pb-3 mb-5 relative z-10">
        <div className="text-[22px] font-black tracking-widest uppercase leading-tight text-[#e6ffce]">
          {project.title}
          <span className="text-[#8fae7e] mx-3">//</span>
          {project.category.toUpperCase()}
          <span className="text-[#8fae7e] mx-3">//</span>
          {project.year}
        </div>
        <div className="flex items-center gap-2 text-[11px] tracking-[0.3em] uppercase text-[#8fae7e]">
          <div className="w-2 h-2 bg-[#c6f24a] animate-pulse" />
          crt_active
        </div>
      </div>

      {/* Summary */}
      <div className="relative z-10 text-[15px] leading-relaxed mb-6 text-[#d0ffb6]">
        <span className="text-[#c6f24a] font-bold mr-2">&gt;</span>
        {project.body.summary}
      </div>

      {/* Highlights */}
      <div className="relative z-10 mb-6">
        <div className="text-[11px] tracking-[0.3em] uppercase text-[#8fae7e] mb-2">
          // highlights
        </div>
        <ul className="space-y-1.5">
          {project.body.highlights.map((h, i) => (
            <li
              key={i}
              className="text-[14px] pl-5 relative text-[#d0ffb6]"
            >
              <span className="absolute left-0 text-[#d6b85a]">▸</span>
              {h}
            </li>
          ))}
        </ul>
      </div>

      {/* Links */}
      <div className="relative z-10 mb-6">
        <div className="text-[11px] tracking-[0.3em] uppercase text-[#8fae7e] mb-2">
          // links
        </div>
        <div className="flex flex-col gap-1">
          {project.body.links.map((l, i) => (
            <div
              key={i}
              className="text-[13px] flex items-baseline gap-2 text-[#d0ffb6]"
            >
              <span className="text-[#c6f24a]">
                ex://project/{project.slug}
              </span>
              <span className="text-[#8fae7e]">— {l.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Spacer + Eject */}
      <div className="relative z-10 flex items-end justify-between mt-auto pt-4 border-t border-[#3d5a42]">
        <div className="text-[10px] tracking-[0.35em] uppercase text-[#8fae7e]">
          sys//crt_output — session_stable
        </div>
        <CyberButton
          variant="destructive"
          onClick={eject}
          className="text-[11px]"
        >
          [ EJECT ]
        </CyberButton>
      </div>
    </div>
  )
}
