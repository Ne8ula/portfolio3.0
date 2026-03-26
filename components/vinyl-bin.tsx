"use client"

import { useState } from "react"

interface Project {
  id: string
  title: string
  category: string
  year: string
}

const projects: Project[] = [
  { id: "01", title: "BRAND_IDENTITY", category: "DESIGN", year: "2024" },
  { id: "02", title: "WEB_PLATFORM", category: "DEV", year: "2024" },
  { id: "03", title: "MOTION_GRAPHICS", category: "ANIMATION", year: "2023" },
  { id: "04", title: "UI_SYSTEM", category: "DESIGN", year: "2023" },
  { id: "05", title: "MOBILE_APP", category: "DEV", year: "2023" },
]

export function VinylBin() {
  const [hoveredProject, setHoveredProject] = useState<string | null>(null)

  return (
    <div className="w-full">
      <div className="flex items-center gap-4 mb-6">
        <span className="font-mono text-xs text-muted-foreground">[RECENT_WORK]</span>
        <div className="flex-1 h-px bg-border" />
        <span className="font-mono text-xs text-muted-foreground">// SCROLL →</span>
      </div>

      <div className="relative overflow-x-auto pb-4 -mx-4 px-4">
        <div className="flex gap-[-20px]" style={{ paddingLeft: "20px" }}>
          {projects.map((project, index) => (
            <div
              key={project.id}
              className="relative flex-shrink-0 cursor-pointer transition-all duration-300"
              style={{
                marginLeft: index === 0 ? 0 : "-30px",
                zIndex: hoveredProject === project.id ? 20 : projects.length - index,
                transform: hoveredProject === project.id ? "translateY(-20px) rotate(-2deg)" : "rotate(0deg)",
              }}
              onMouseEnter={() => setHoveredProject(project.id)}
              onMouseLeave={() => setHoveredProject(null)}
            >
              <div
                className={`
                  w-[180px] h-[200px] md:w-[220px] md:h-[240px]
                  bg-card border-2 border-foreground
                  flex flex-col justify-between p-4
                  transition-all duration-300
                  ${hoveredProject === project.id ? "glow-amber" : ""}
                `}
              >
                {/* Project number */}
                <div className="font-mono text-4xl md:text-5xl font-bold text-muted">{project.id}</div>

                {/* Project info */}
                <div>
                  <div className="font-mono text-xs text-muted-foreground mb-1">
                    {project.category} // {project.year}
                  </div>
                  <div className="font-mono text-sm font-bold leading-tight">{project.title}</div>
                </div>

                {/* Corner decoration */}
                <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-foreground opacity-30" />
                <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-foreground opacity-30" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
