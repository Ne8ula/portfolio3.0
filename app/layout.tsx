import type React from "react"
import type { Metadata } from "next"
import localFont from "next/font/local"

import { Analytics } from "@vercel/analytics/next"
import "./globals.css"

import { Libre_Baskerville as V0_Font_Libre_Baskerville, IBM_Plex_Mono as V0_Font_IBM_Plex_Mono, Lora as V0_Font_Lora } from 'next/font/google'

// Initialize fonts
const _libreBaskerville = V0_Font_Libre_Baskerville({ subsets: ['latin'], weight: ["400","700"] })
const _ibmPlexMono = V0_Font_IBM_Plex_Mono({ subsets: ['latin'], weight: ["100","200","300","400","500","600","700"] })
const _lora = V0_Font_Lora({ subsets: ['latin'], weight: ["400","500","600","700"] })

const vcrOsdMono = localFont({
  src: "../public/fonts/vcr-osd-mono.ttf",
  variable: "--font-vcr",
  display: "swap",
})

const spaceMono = localFont({
  src: "../public/fonts/spacemono-regular.ttf",
  variable: "--font-space",
  display: "swap",
})

export const metadata: Metadata = {
  title: "DESIGN_ARCHIVE // V.2025",
  description: "A technical portfolio for digital organization and creative exploration",
  generator: "v0.app",
  icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/apple-icon.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${vcrOsdMono.variable} ${spaceMono.variable}`}>
      <body className="font-mono antialiased">
        {children}
        <Analytics />
      </body>
    </html>
  )
}
