"use client"

import { useEffect, useState } from "react"
import { projects } from "@/lib/projects"
import { useSceneStore, type CrateFilter } from "@/lib/store/scene-store"

function pad(n: number) {
  return n.toString().padStart(2, "0")
}

function formatStamp(d: Date) {
  const y = d.getFullYear()
  const mo = pad(d.getMonth() + 1)
  const da = pad(d.getDate())
  const h = pad(d.getHours())
  const mi = pad(d.getMinutes())
  const s = pad(d.getSeconds())
  return `${y}.${mo}.${da} // ${h}:${mi}:${s}`
}

const FILTER_ORDER: { key: CrateFilter; label: string }[] = [
  { key: "all", label: `all ${projects.length}` },
  { key: "designs", label: "designs" },
  { key: "games", label: "games" },
  { key: "prototypes", label: "prototypes" },
]

// DOM overlay above the R3F canvas — Ref3's 2D page UI, not world-space.
// Top-left timestamp, center "every : project" label, right-rail filter tags,
// bottom-right [save][share][?] triad (visual only per Ref3).
export function CrateHud() {
  const view = useSceneStore((s) => s.view)
  const filter = useSceneStore((s) => s.filterCategory)
  const setFilter = useSceneStore((s) => s.setFilterCategory)

  const visible = view === "desk"

  const [now, setNow] = useState<Date | null>(null)
  useEffect(() => {
    setNow(new Date())
    const id = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [])

  return (
    <div
      className="fixed inset-0 z-[50]"
      style={{
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? "auto" : "none",
        transition: "opacity 400ms ease",
      }}
      aria-hidden={!visible}
    >
      {/* Top-left — live mono timestamp */}
      <div className="absolute top-6 left-6 pointer-events-none select-none">
        <div className="font-mono text-[11px] tracking-[0.2em] text-ink-warm/80 uppercase">
          sys//crate_index
        </div>
        <div className="font-mono text-sm tracking-[0.1em] text-ink-warm mt-1">
          {now ? formatStamp(now) : "----.--.-- // --:--:--"}
        </div>
      </div>

      {/* Center-top — "every : project" low-opacity label */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2 pointer-events-none select-none">
        <div className="font-mono text-xs tracking-[0.35em] text-ink-warm/45 lowercase">
          every : project
        </div>
      </div>

      {/* Right-rail — filter tag list */}
      <div className="absolute top-1/2 right-8 -translate-y-1/2 flex flex-col items-end gap-3">
        <div className="font-mono text-[10px] tracking-[0.3em] text-ink-warm/50 uppercase mb-1">
          // index
        </div>
        {FILTER_ORDER.map((f) => {
          const active = filter === f.key
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className="font-mono text-sm tracking-[0.1em] transition-all group"
              style={{
                color: active ? "#C91D22" : "#2A2520",
                opacity: active ? 1 : 0.7,
              }}
            >
              <span className="inline-block mr-2 text-[10px]">
                {active ? "▸" : " "}
              </span>
              <span
                className={
                  active
                    ? "underline underline-offset-4 decoration-2"
                    : "group-hover:underline underline-offset-4"
                }
              >
                {f.label}
              </span>
            </button>
          )
        })}
      </div>

      {/* Bottom-right — [save][share][?] visual-only triad */}
      <div className="absolute bottom-6 right-8 flex items-center gap-3 pointer-events-none select-none">
        <span className="font-mono text-xs tracking-[0.15em] text-ink-warm/60">[save]</span>
        <span className="font-mono text-xs tracking-[0.15em] text-ink-warm/60">[share]</span>
        <span className="font-mono text-xs tracking-[0.15em] text-ink-warm/60">[?]</span>
      </div>

      {/* Bottom-left — tiny status pulse */}
      <div className="absolute bottom-6 left-6 flex items-center gap-2 pointer-events-none select-none">
        <div className="w-1.5 h-1.5 bg-jade-soft animate-pulse" />
        <span className="font-mono text-[10px] tracking-[0.25em] text-ink-warm/60 uppercase">
          crate_online
        </span>
      </div>
    </div>
  )
}
