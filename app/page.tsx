"use client"

import dynamic from "next/dynamic"

// The cockpit is fully client-side (three.js, canvas, window bridge, and
// Math.random-seeded boot text), so render it browser-only to avoid SSR /
// hydration mismatches.
const CockpitApp = dynamic(
  () => import("@/components/cockpit/cockpit-app").then((m) => m.CockpitApp),
  { ssr: false }
)

export default function Home() {
  return <CockpitApp />
}
