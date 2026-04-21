"use client"

import { useEffect, useState } from "react"

const CRITICAL_ASSETS = [
  "/assets/textures/paper-grain.svg",
  "/assets/overlays/ar-shards/shard-01-lime-wedge.svg",
  "/assets/overlays/ar-shards/shard-03-lime-bolt.svg",
  "/assets/overlays/ar-shards/shard-06-kanji-frame.svg",
  "/assets/overlays/ar-shards/shard-08-ink-spike.svg",
  "/logo.webp",
]

export function useAssetPreloader(extraAssets: string[] = []) {
  const assets = [...CRITICAL_ASSETS, ...extraAssets]
  const [loaded, setLoaded] = useState(0)
  const [done, setDone] = useState(false)

  useEffect(() => {
    let cancelled = false
    let count = 0
    const tick = () => {
      count += 1
      if (cancelled) return
      setLoaded(count)
      if (count >= assets.length) setDone(true)
    }

    assets.forEach((src) => {
      const img = new Image()
      img.onload = tick
      img.onerror = tick
      img.src = src
    })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const progress = assets.length === 0 ? 1 : loaded / assets.length
  return { progress, done }
}
