import type React from "react"
import type { Metadata } from "next"

import { Analytics } from "@vercel/analytics/next"
import "./globals.css"

export const metadata: Metadata = {
  title: "CLR // LIVE_GLOBE_FPS",
  description: "Alex Xiong — Editorial Cockpit portfolio. Boot a retro terminal, warp into a first-person 3D desk, browse the crate.",
  generator: "Next.js",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Editorial-cockpit type: Cormorant Garamond (display), JetBrains Mono
            (chrome), VT323 + Major Mono Display (boot terminal). Loaded by literal
            family name so the ported inline styles resolve exactly. */}
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500;700&family=VT323&family=Major+Mono+Display&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
