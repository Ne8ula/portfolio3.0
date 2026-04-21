"use client"

import { useEffect, useState } from "react"
import { AnimatePresence } from "framer-motion"
import { BootScreen } from "./boot-screen"
import { useAssetPreloader } from "./use-asset-preloader"
import { projects } from "@/lib/projects"

const SESSION_KEY = "portfolio3-booted"

// Cover art — preloaded alongside the critical assets so the boot screen
// gates on them being cached, and vinyls in the crate render without a
// texture flash on first paint.
const COVER_ASSETS = projects.map((p) => p.coverArt)

export function SceneReadyGate({ children }: { children: React.ReactNode }) {
  const [showBoot, setShowBoot] = useState<boolean | null>(null)
  const { progress } = useAssetPreloader(COVER_ASSETS)

  useEffect(() => {
    const already = typeof window !== "undefined" && sessionStorage.getItem(SESSION_KEY) === "1"
    setShowBoot(!already)
  }, [])

  const handleDismiss = () => {
    sessionStorage.setItem(SESSION_KEY, "1")
    setShowBoot(false)
  }

  // Until we know whether to boot, render children hidden behind a plain
  // parchment screen to avoid an FOUC flash of the real UI.
  if (showBoot === null) {
    return (
      <>
        <div className="fixed inset-0 z-[100] bg-background" aria-hidden />
        {children}
      </>
    )
  }

  return (
    <>
      <AnimatePresence>
        {showBoot && <BootScreen key="boot" progress={progress} onDismiss={handleDismiss} />}
      </AnimatePresence>
      {children}
    </>
  )
}
