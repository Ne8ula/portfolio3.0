"use client"

import { useState } from "react"
import { Header } from "@/components/header"
import { IsometricCube } from "@/components/isometric-cube"
import { AboutSection } from "@/components/about-section"
import { ProjectsSection } from "@/components/projects-section"
import { ContactSection } from "@/components/contact-section"

export default function Home() {
  const [isMinimized, setIsMinimized] = useState(false)

  return (
    <div className="min-h-screen bg-background relative flex flex-col text-foreground selection:bg-primary selection:text-primary-foreground">
      {/* Background grid */}
      <div className="fixed inset-0 grid-pattern pointer-events-none z-0 opacity-50"></div>

      <div className="sticky top-0 z-50 w-full">
        <Header />
      </div>

      <main className="flex flex-col relative z-[1]">

        {/* Hero Section */}
        <section className="h-[calc(100vh-80px)] min-h-[600px] flex flex-col lg:flex-row items-center justify-center relative overflow-hidden p-4 md:p-8">
          {/* Left Brutalist Control Panel */}
          <div
            className={`lg:w-1/3 xl:w-1/4 h-full flex flex-col justify-center transition-all duration-500 ease-in-out z-10 ${isMinimized
                ? "opacity-0 -translate-x-full pointer-events-none"
                : "opacity-100 translate-x-0"
              }`}
          >
            {/* Main Title Block */}
            <div className="border-4 border-primary bg-background/90 p-6 md:p-8 shadow-[8px_8px_0px_var(--primary)] mb-8 relative">
              <h1 className="font-mono text-4xl md:text-5xl lg:text-6xl font-black tracking-tighter text-glow-red uppercase leading-none">
                ALEX<br />XIONG
              </h1>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <span className="bg-primary text-primary-foreground font-mono font-bold px-2 py-1 text-sm tracking-widest">
                  SYS.V.2025
                </span>
                <span className="font-mono text-muted-foreground text-xs bg-muted px-2 py-1">LINK_ACTIVE</span>
              </div>
              {/* Cyberpunk accent */}
              <div className="absolute top-0 right-0 w-12 h-12 border-b-4 border-l-4 border-primary"></div>
            </div>

            {/* About Block */}
            <div className="border-4 border-border bg-card shadow-[8px_8px_0px_var(--border)] overflow-hidden relative group hover:border-secondary transition-colors duration-300">
              {/* Top Bar */}
              <div className="flex justify-between items-center border-b-4 border-border px-4 py-2 bg-muted group-hover:bg-secondary/20 transition-colors">
                <span className="font-mono text-xs font-bold tracking-widest text-muted-foreground group-hover:text-secondary group-hover:text-glow-jade transition-all">USER.DATA_STREAM</span>
                <button
                  onClick={() => setIsMinimized(true)}
                  className="w-6 h-6 flex items-center justify-center border-2 border-border hover:bg-destructive hover:border-destructive hover:text-destructive-foreground transition-all"
                >
                  <span className="font-bold text-lg leading-none mt-[-2px]">×</span>
                </button>
              </div>

              <div className="p-6">
                <p className="font-sans text-sm md:text-base text-card-foreground leading-relaxed">
                  I build playful, high-stakes products by obsessing over users—their
                  motivations, confusion, and every detail in between. This space serves as
                  a tactical data repository for my shipped experiences.
                </p>
              </div>

              {/* Bottom accent */}
              <div className="absolute bottom-2 right-2 text-border font-mono text-[10px] uppercase">
                // DATA_CHUNK_END
              </div>
            </div>
          </div>

          {/* Center 3D Cube (Hero) */}
          <div
            className={`flex-1 flex items-center justify-center relative transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${isMinimized ? "scale-110 lg:scale-125" : "scale-100"
              }`}
          >
            {/* Circular Radar Background Behind Cube */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
              <div className="w-[300px] h-[300px] md:w-[500px] md:h-[500px] border-[1px] border-dashed border-secondary rounded-full animate-[spin_60s_linear_infinite]"></div>
              <div className="absolute w-[200px] h-[200px] md:w-[350px] md:h-[350px] border-[1px] border-primary rounded-full"></div>
              <div className="absolute w-[100px] h-[100px] border-[1px] border-border rounded-full"></div>
              <div className="absolute w-full h-[1px] bg-secondary/30"></div>
              <div className="absolute h-full w-[1px] bg-secondary/30"></div>
            </div>

            <IsometricCube />
          </div>

          {/* Right Eastern Vertical Align Block */}
          <div className={`hidden lg:flex flex-col items-center justify-center h-full absolute right-12 top-0 transition-opacity duration-500 pointer-events-none ${isMinimized ? "opacity-0" : "opacity-100"}`}>
            <div className="h-[30%] w-[1px] bg-border relative">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3 h-3 bg-secondary"></div>
            </div>
            <div className="font-mono text-2xl font-black text-muted-foreground/30 tracking-[0.5em] [writing-mode:vertical-rl] py-8 rotate-180 drop-shadow-md">
              システム警告 // SECTOR_9
            </div>
            <div className="h-[30%] w-[1px] bg-border relative">
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-4 bg-primary border-2 border-background"></div>
            </div>
          </div>

          {/* Overlay Restore Button */}
          {isMinimized && (
            <button
              onClick={() => setIsMinimized(false)}
              className="absolute bottom-12 left-8 border-4 border-secondary bg-background px-6 py-3 shadow-[6px_6px_0px_var(--secondary)] hover:bg-secondary hover:text-secondary-foreground transition-all duration-300 font-mono font-bold tracking-widest text-glow-jade group z-50 focus:outline-none"
            >
              <span className="group-hover:animate-pulse">_RESTORE_UI</span>
            </button>
          )}

          {/* Frame borders */}
          <div className="absolute top-0 left-0 w-full h-2 bg-primary z-20"></div>
          <div className="absolute bottom-0 left-0 w-full h-2 bg-primary z-20"></div>
        </section>

        {/* New Sections */}
        <div className="relative z-10 bg-background">
          <AboutSection />
          <ProjectsSection />
          <ContactSection />
        </div>

      </main>

      <footer className="border-t-4 border-border bg-card px-6 py-4 flex-shrink-0 relative z-20 mt-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 font-mono text-xs font-bold text-muted-foreground">
          <div className="flex items-center gap-4">
            <div className="w-2 h-2 bg-secondary animate-pulse"></div>
            <span>© 2025 ALL RIGHTS RESERVED</span>
          </div>
          <div className="flex items-center gap-8">
            <a href="#" className="hover:text-secondary transition-colors hover:text-glow-jade">
              [ GITHUB ]
            </a>
            <a href="#" className="hover:text-secondary transition-colors hover:text-glow-jade">
              [ LINKEDIN ]
            </a>
            <a href="#" className="hover:text-secondary transition-colors hover:text-glow-jade">
              [ TWITTER ]
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
