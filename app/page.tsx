"use client"

import { useState } from "react"
import { Header } from "@/components/header"
import { IsometricCube } from "@/components/isometric-cube"

export default function Home() {
  const [isMinimized, setIsMinimized] = useState(false)

  return (
    <div className="h-dvh max-h-dvh bg-background grid-pattern crt-lines relative overflow-hidden flex flex-col">
      <Header />

      <main className="flex-1 flex flex-col lg:flex-row items-center justify-center gap-4 lg:gap-12 xl:gap-16 px-4 md:px-8 lg:px-16 xl:px-20 relative z-[1] overflow-hidden">
        <div
          className={`lg:flex-1 lg:max-w-sm xl:max-w-md lg:mr-8 transition-all duration-500 ease-in-out ${
            isMinimized
              ? "opacity-0 translate-y-full absolute bottom-0 left-4 pointer-events-none"
              : "opacity-100 translate-y-0"
          }`}
        >
          <h1 className="font-mono text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold tracking-tight mb-4 lg:mb-6 text-balance text-center lg:text-left">
            ALEX_PORTFOLIO // V.2025
          </h1>

          {/* Retro OS-style window card */}
          <div className="relative bg-[#f4f1e8] border-2 border-[#1a1a1a] rounded-xl shadow-[6px_6px_0px_#1a1a1a] overflow-hidden">
            {/* Inner border for double-line effect */}
            <div className="absolute inset-[3px] border border-[#1a1a1a] rounded-lg pointer-events-none" />

            <div className="flex items-center justify-end px-3 py-2 border-b border-[#1a1a1a]">
              <button
                onClick={() => setIsMinimized(true)}
                className="w-5 h-5 rounded-full bg-[#e8dbb8] border-2 border-[#1a1a1a] flex items-center justify-center hover:bg-[#d4a853] transition-colors"
              >
                <span className="text-[#1a1a1a] font-bold text-xs leading-none">−</span>
              </button>
            </div>

            <div className="p-5 md:p-6">
              <p className="font-sans text-xs sm:text-sm md:text-base text-[#1a1a1a] leading-relaxed text-center">
                Hey! I'm Alex Xiong. I love building playful, high-stakes products by obsessing over users—their
                motivations, their confusion, and every detail in between. Throughout my portfolio, you'll see designs
                and prototypes that turn these insights into clear decisions and shipped experiences that feel simple,
                human, and intentional.
              </p>
            </div>
          </div>
        </div>

        <div
          className={`relative flex-shrink-0 transition-all duration-500 ease-in-out ${
            isMinimized ? "scale-125" : "scale-100"
          }`}
        >
          <IsometricCube />
        </div>

        {isMinimized && (
          <button
            onClick={() => setIsMinimized(false)}
            className="absolute bottom-4 left-4 bg-[#f4f1e8] border-2 border-[#1a1a1a] rounded-lg px-4 py-2 shadow-[3px_3px_0px_#1a1a1a] hover:bg-[#e8dbb8] transition-colors font-mono text-xs"
          >
            [RESTORE WINDOW]
          </button>
        )}
      </main>

      <footer className="border-t border-[#1a1a1a] bg-[#f4f1e8] px-6 py-3 md:px-12 flex-shrink-0">
        <div className="flex flex-col md:flex-row items-center justify-between gap-2 md:gap-4 font-mono text-xs">
          <div className="flex items-center gap-2 text-[#1a1a1a]">
            <span>© 2025 ALEX PORTFOLIO</span>
            <span className="hidden md:inline">—</span>
            <span className="hidden md:inline">ALL RIGHTS RESERVED</span>
          </div>
          <div className="flex items-center gap-6 text-[#1a1a1a] font-bold">
            <a href="#" className="hover:text-[#d4a853] transition-colors underline underline-offset-4">
              GITHUB
            </a>
            <a href="#" className="hover:text-[#d4a853] transition-colors underline underline-offset-4">
              LINKEDIN
            </a>
            <a href="#" className="hover:text-[#d4a853] transition-colors underline underline-offset-4">
              TWITTER
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
