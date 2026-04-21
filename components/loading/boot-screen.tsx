"use client"

import { useEffect, useMemo, useState } from "react"
import { motion } from "framer-motion"
import { readsPrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion"

const BOOT_LINES = [
  "SYSTEM_INIT ................ ok",
  "LOAD FONTS/VCR_OSD_MONO ..... ok",
  "LOAD FONTS/SPACEMONO ........ ok",
  "MOUNT /desk ................. staged",
  "LOAD crate[vinyls] .......... staged",
  "CRT_WARMUP .................. staged",
  "LINK ex://boot.0224/handoff . live",
]

const BLOCK_FILL = "█"
const BLOCK_EMPTY = "░"
const BAR_WIDTH = 32

function progressBar(p: number) {
  const filled = Math.round(p * BAR_WIDTH)
  return BLOCK_FILL.repeat(filled) + BLOCK_EMPTY.repeat(BAR_WIDTH - filled)
}

interface BootScreenProps {
  progress: number
  onDismiss?: () => void
  holdMs?: number
}

export function BootScreen({ progress, onDismiss, holdMs = 2400 }: BootScreenProps) {
  const [reducedMotion, setReducedMotion] = useState(false)
  const [shownLines, setShownLines] = useState(0)
  const [timeElapsed, setTimeElapsed] = useState(0)

  useEffect(() => {
    const reduce = readsPrefersReducedMotion()
    setReducedMotion(reduce)
    if (reduce) setShownLines(BOOT_LINES.length)
  }, [])

  useEffect(() => {
    const start = Date.now()
    const tick = setInterval(() => setTimeElapsed(Date.now() - start), 80)
    return () => clearInterval(tick)
  }, [])

  // Stream boot lines in as progress advances; also advance on pure time so the
  // screen feels alive even if preload finishes instantly.
  useEffect(() => {
    if (reducedMotion) return
    // Drive line-streaming on time (~280ms per line) so the boot reads as a
    // deliberate sequence, not a frame-1 dump — preload normally resolves
    // instantly in dev, so tying lines to progress would skip the drama.
    const byTime = Math.floor(timeElapsed / 280)
    const target = Math.min(BOOT_LINES.length, byTime)
    setShownLines(target)
  }, [progress, timeElapsed, reducedMotion])

  // Dismiss when ready. Under reduced motion we cut the dramatic hold so users
  // still see the info (per plan) but don't sit through the cadence.
  useEffect(() => {
    if (!onDismiss) return
    if (progress < 1) return
    const effectiveHold = reducedMotion ? Math.min(holdMs, 600) : holdMs
    const remaining = Math.max(0, effectiveHold - timeElapsed)
    const t = setTimeout(onDismiss, remaining)
    return () => clearTimeout(t)
  }, [progress, onDismiss, holdMs, timeElapsed, reducedMotion])

  const pct = Math.round(progress * 100).toString().padStart(3, "0")

  // Shards flash in at two checkpoints along the time-driven reveal — progress
  // can resolve instantly in dev, so we anchor to the visible boot-line ratio.
  // Under reduced motion we suppress the shard animation entirely.
  const revealRatio = shownLines / BOOT_LINES.length
  const showShardA = !reducedMotion && revealRatio >= 0.3
  const showShardB = !reducedMotion && revealRatio >= 0.7

  const seconds = useMemo(() => (timeElapsed / 1000).toFixed(2), [timeElapsed])

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scaleY: 0.02 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[100] bg-background text-foreground overflow-hidden"
      style={{ transformOrigin: "center" }}
    >
      <div className="paper-grain" />
      <div className="vignette-warm" />
      <div className="edge-foxing" />

      {/* Corner brackets */}
      <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-primary" />
      <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-primary" />
      <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-primary" />
      <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-primary" />

      {/* Header strip */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 py-2 font-mono text-[10px] uppercase font-bold">
        <span className="text-muted-foreground">// boot.sequence</span>
        <span className="url-tag">ex://boot.0224/handoff</span>
        <span className="text-muted-foreground">T+{seconds}s</span>
      </div>

      {/* Flashing shards (cold-electric band — never exceeds ~12% area) */}
      {showShardA && (
        <motion.img
          initial={{ opacity: 0, x: -40, rotate: -8 }}
          animate={{ opacity: 1, x: 0, rotate: -4 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          src="/assets/overlays/ar-shards/shard-01-lime-wedge.svg"
          alt=""
          className="absolute top-[18%] left-[6%] w-56 pointer-events-none"
          style={{ mixBlendMode: "screen" }}
        />
      )}
      {showShardB && (
        <motion.img
          initial={{ opacity: 0, y: 30, rotate: 6 }}
          animate={{ opacity: 1, y: 0, rotate: 3 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          src="/assets/overlays/ar-shards/shard-03-lime-bolt.svg"
          alt=""
          className="absolute bottom-[10%] right-[6%] w-24 pointer-events-none"
          style={{ mixBlendMode: "screen" }}
        />
      )}
      {showShardB && (
        <span
          className="kanji-glitch text-7xl"
          style={{ top: "24%", right: "12%" }}
        >
          リギ
        </span>
      )}

      {/* Centerpiece terminal */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-[min(640px,90vw)] border-2 border-foreground bg-paper-warm/80 backdrop-blur-sm shadow-[6px_6px_0px_#1a1a1a] p-6">
          <div className="flex items-center justify-between border-b border-foreground/40 pb-2 mb-4">
            <span className="font-mono text-xs font-bold uppercase tracking-widest">
              portfolio.sys / cold_boot
            </span>
            <span className="font-mono text-xs text-primary font-bold">v.2025.04</span>
          </div>

          <h1 className="font-mono text-4xl md:text-5xl font-black tracking-tighter uppercase leading-none text-ink-warm mb-4">
            SYSTEM<br />INIT
          </h1>

          <div className="font-mono text-xs leading-5 text-foreground/80 mb-4 min-h-[9rem]">
            {BOOT_LINES.slice(0, shownLines).map((line, i) => (
              <div key={i}>
                <span className="text-primary">{">"}</span> {line}
              </div>
            ))}
            {shownLines < BOOT_LINES.length && (
              <div>
                <span className="text-primary">{">"}</span>{" "}
                <span className="animate-pulse">_</span>
              </div>
            )}
          </div>

          <div className="font-mono text-[11px] text-foreground/70 select-none">
            [{progressBar(progress)}] {pct}%
          </div>
        </div>
      </div>

      {/* Scanlines */}
      <div className="scanlines" />
    </motion.div>
  )
}
