import type React from "react"
import type { Metadata } from "next"

import { Analytics } from "@vercel/analytics/next"

import { AccessibilityProvider } from "@/components/responsive/accessibility-provider"
import { AccessibilityTrigger } from "@/components/responsive/accessibility-dialog"

import "./globals.css"

export const metadata: Metadata = {
  title: "CLR // LIVE_GLOBE_FPS",
  description: "Alex Xiong — Editorial Cockpit portfolio. Boot a retro terminal, warp into a first-person 3D desk, browse the crate.",
  generator: "Next.js",
}

// Pre-hydration stamp of the RESOLVED accessibility state so first paint
// already honors persisted overrides + system preferences (§A.6 "before
// paint where possible"). Mirrors lib/responsive/accessibility.ts — the
// storage key and attribute names are pinned by tests/unit/accessibility
// so drift fails the unit gate. AccessibilityProvider re-resolves on mount
// and owns the attributes from then on.
const PRE_PAINT_ACCESSIBILITY_SCRIPT = `(function () {
  try {
    var prefs = {};
    try { prefs = JSON.parse(localStorage.getItem('cockpit-a11y-v1')) || {}; } catch (e) {}
    var mq = function (q) {
      try { return window.matchMedia(q).matches; } catch (e) { return false; }
    };
    var pick = function (v, allowed) { return allowed.indexOf(v) >= 0 ? v : 'system'; };
    var motion = pick(prefs.motion, ['system', 'full', 'reduced']);
    var contrast = pick(prefs.contrast, ['system', 'standard', 'high']);
    var transparency = pick(prefs.transparency, ['system', 'standard', 'reduced']);
    var text = pick(prefs.text, ['system', 'standard', 'large']);
    var controls = pick(prefs.controls, ['system', 'standard', 'large']);
    var root = document.documentElement;
    root.setAttribute('data-a11y-motion',
      (motion === 'system' ? mq('(prefers-reduced-motion: reduce)') : motion === 'reduced') ? 'reduced' : 'full');
    root.setAttribute('data-a11y-contrast',
      (contrast === 'system' ? mq('(prefers-contrast: more)') : contrast === 'high') ? 'high' : 'standard');
    root.setAttribute('data-a11y-transparency',
      (transparency === 'system' ? mq('(prefers-reduced-transparency: reduce)') : transparency === 'reduced') ? 'reduced' : 'standard');
    root.setAttribute('data-a11y-text', text === 'large' ? 'large' : 'standard');
    root.setAttribute('data-a11y-controls', controls === 'large' ? 'large' : 'standard');
  } catch (e) {}
})();`

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
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
        <script dangerouslySetInnerHTML={{ __html: PRE_PAINT_ACCESSIBILITY_SCRIPT }} />
      </head>
      <body>
        <AccessibilityProvider>
          {children}
          {/* Stage chrome above every phase: the ACCESSIBILITY entry point is
              reachable from boot, cockpit, and ordinary routes (§A.6.1), and
              boot timelines wait for it to become operable (§A.4.3 tier 2). */}
          <AccessibilityTrigger />
        </AccessibilityProvider>
        <Analytics />
      </body>
    </html>
  )
}
