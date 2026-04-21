"use client"

import { useEffect, useState } from "react"

export function usePrefersReducedMotion() {
  const [prefers, setPrefers] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return
    setPrefers(window.matchMedia("(prefers-reduced-motion: reduce)").matches)
  }, [])

  return prefers
}

export function readsPrefersReducedMotion() {
  if (typeof window === "undefined" || !window.matchMedia) return false
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
}
