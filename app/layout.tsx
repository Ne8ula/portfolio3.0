import type { Metadata } from 'next'
import type React from 'react'

import { Analytics } from '@vercel/analytics/next'

import { AccessibilityTrigger } from '@/components/responsive/accessibility-dialog'
import { AccessibilityProvider } from '@/components/responsive/accessibility-provider'
import { deriveProfileMetadata } from '@/lib/content/serializers'
import { PROFILE } from '@/lib/portfolio/profile'
import { SITE_URL } from '@/lib/site/site'

import './globals.css'

const ROOT_METADATA = deriveProfileMetadata(PROFILE, SITE_URL)
export const metadata: Metadata = {
  title: ROOT_METADATA.title,
  description: ROOT_METADATA.description,
  metadataBase: new URL(SITE_URL),
  alternates: {
    canonical: ROOT_METADATA.canonical,
  },
  generator: 'Next.js',
}

// Pre-hydration stamp of the resolved accessibility and document-appearance
// states so first paint honors persisted overrides + system preferences.
// Mirrors lib/responsive/accessibility.ts and lib/responsive/appearance.ts;
// storage/attribute names are pinned by unit tests.
const PRE_PAINT_PREFERENCES_SCRIPT = `(function () {
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
    var storedAppearance = null;
    try { storedAppearance = localStorage.getItem('cockpit-theme'); } catch (e) {}
    var appearance = (storedAppearance === 'light' || storedAppearance === 'dark')
      ? storedAppearance
      : (mq('(prefers-color-scheme: dark)') ? 'dark' : 'light');
    root.setAttribute('data-appearance', appearance);
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
        <script dangerouslySetInnerHTML={{ __html: PRE_PAINT_PREFERENCES_SCRIPT }} />
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
