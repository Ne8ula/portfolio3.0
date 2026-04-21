"use client"

import { useState } from "react"
import dynamic from "next/dynamic"
import { Header } from "@/components/header"
import { IsometricCube } from "@/components/isometric-cube"
import { CyberButton } from "@/components/ui/cyber-button"
import { GlitchOverlay } from "@/components/glitch-overlay"
import { HandTrackerOverlay } from "@/components/ui/hand-tracker"
import { CrateHud } from "@/components/scene/crate-hud"
import { useSceneStore } from "@/lib/store/scene-store"
import { useCrateKeyboardNav } from "@/hooks/use-crate-keyboard-nav"

const SceneCanvas = dynamic(
  () => import("@/components/scene/scene-canvas").then((m) => m.SceneCanvas),
  { ssr: false }
)

export default function Home() {
  const [isMinimized, setIsMinimized] = useState(false)
  const view = useSceneStore((s) => s.view)
  useCrateKeyboardNav()

  // Shell is visually present through cube + zooming so the CSS cube remains
  // on screen as it fades into the R3F paperweight. It only fully disappears
  // once the camera has settled on `desk`.
  const shellVisible = view === "cube" || view === "zooming"
  // Side panels (left terminal, right vertical panel) dim the moment the
  // handoff begins so the eye isn't pulled sideways during the zoom-out.
  const sidePanelsDimmed = view !== "cube"
  // The cube itself shrinks + fades during zooming; at `desk` it's gone.
  const cubeFaded = view !== "cube"
  // Pointer is only live while the landing actually owns the screen.
  const shellInteractive = view === "cube"

  return (
    <div className="h-screen max-h-screen bg-background relative flex flex-col text-foreground selection:bg-primary selection:text-primary-foreground font-sans overflow-hidden">

      {/* R3F desk scene — sits behind the DOM landing. Crossfades in during `zooming`. */}
      <SceneCanvas />

      {/* Crate HUD — DOM overlay above the canvas, only visible on `desk`.
          Sits at z-[50] — below GlitchOverlay (z-[60]) but above the canvas (z-[1]). */}
      <CrateHud />

      {/* DOM landing shell — stays mounted through the handoff so the CSS cube
          can fade *over* the already-visible R3F desk; hides once view==='desk'. */}
      <div
        className="absolute inset-0 flex flex-col"
        style={{
          opacity: shellVisible ? 1 : 0,
          pointerEvents: shellInteractive ? "auto" : "none",
          transition: "opacity 400ms ease",
        }}
        aria-hidden={!shellInteractive}
      >

      {/* Dynamic Background structural overlay shader — must stay above the R3F canvas */}
      <GlitchOverlay />

      <div className="absolute top-0 w-full z-50">
        <Header />
      </div>

      <main className="flex-1 flex flex-col relative z-[1] w-full h-full overflow-hidden mt-[70px]">
        
        {/* Tech/ONI Hero Section Locked to Screen */}
        <section className="flex-1 flex flex-col lg:flex-row items-center justify-center relative overflow-hidden p-4 md:p-6 lg:p-12 gap-8 h-full">
          
          {/* Left Data Terminal */}
          <div
            className={`lg:w-[350px] xl:w-[400px] h-full flex flex-col justify-center transition-all duration-500 ease-in-out z-20 ${
                isMinimized || sidePanelsDimmed
                ? "opacity-0 -translate-x-12 pointer-events-none"
                : "opacity-100 translate-x-0"
              }`}
          >
            {/* Structural Title Card */}
            <div className="border border-primary/50 bg-background/80 backdrop-blur-md p-6 mb-6 relative group hover:border-primary transition-colors shadow-sm">
              <div className="absolute top-0 right-0 px-2 py-0.5 bg-primary text-primary-foreground font-mono text-[9px] font-bold">AUTH_MODE_TRUE</div>
              
              <div className="flex items-start justify-between gap-4 mt-3">
                <h1 className="font-mono text-5xl md:text-6xl font-black tracking-tighter text-foreground uppercase leading-none mix-blend-multiply">
                  ALEX<br />XIONG
                </h1>
                <div className="w-14 h-14 md:w-20 md:h-20 border-[1.5px] border-primary bg-card relative mix-blend-multiply drop-shadow-sm flex-shrink-0">
                  <img src="/logo.webp" alt="Alex Xiong Logo" className="w-full h-full object-contain p-1" />
                </div>
              </div>
              
              <div className="mt-4 flex flex-col gap-2 border-t border-border/30 pt-3">
                <div className="flex justify-between items-center font-mono text-xs">
                  <span className="text-muted-foreground font-bold">SYSTEM_VERSION</span>
                  <span className="text-primary font-bold">V.2025.04</span>
                </div>
                <div className="flex justify-between items-center font-mono text-xs">
                  <span className="text-muted-foreground font-bold">NETWORK_STATUS</span>
                  <span className="text-secondary font-black animate-pulse bg-secondary/10 px-1">STABLE</span>
                </div>
              </div>
              
              {/* Corner bracket decorative */}
              <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-primary"></div>
            </div>

            {/* About Interface */}
            <div className="border border-border/50 bg-card/60 backdrop-blur-md relative overflow-hidden group shadow-sm hover:border-border transition-colors">
              <div className="flex justify-between items-center border-b border-border/30 px-3 py-1 bg-muted/40">
                <span className="font-mono text-[9px] tracking-widest text-muted-foreground font-bold">// DATA_STREAM_OPEN</span>
                <button
                  onClick={() => setIsMinimized(true)}
                  className="w-5 h-5 flex items-center justify-center border border-transparent hover:border-primary hover:bg-primary/10 hover:text-primary transition-all text-xs focus:outline-none"
                >
                  <span className="leading-none font-bold">×</span>
                </button>
              </div>

              <div className="p-5 relative">
                <p className="font-mono text-xs text-foreground/80 leading-relaxed font-medium">
                  <span className="text-primary font-bold">{">"}</span> Select a cube surface to interface mapping:<br/><br/>
                  This terminal serves as a tactical, verifiable structure for operational tracking. Unlocking data sectors requires physical interaction routing.
                </p>
                <div className="mt-6 flex items-center gap-1.5">
                   <div className="h-[2px] w-8 bg-primary/80"></div>
                   <div className="h-[2px] w-4 bg-muted-foreground/50"></div>
                   <div className="h-[2px] w-1 bg-secondary/80"></div>
                </div>
                
                <div className="absolute right-[-10px] bottom-[-20px] font-mono text-8xl font-black text-muted/20 mix-blend-multiply pointer-events-none select-none">
                  01
                </div>
              </div>
            </div>
          </div>

          {/* Center ONI Cube */}
          <div className={`flex-1 flex items-center justify-center relative transition-all duration-700 z-10 w-full h-full ${isMinimized ? "scale-110 blur-[1px] opacity-80" : "scale-100"}`}>

            {/* Tech Radar Core - Behind the Cube (dims alongside the panels during handoff) */}
            <div
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
              style={{
                opacity: sidePanelsDimmed ? 0 : 0.4,
                transition: "opacity 400ms ease",
              }}
            >
              <div className="w-[300px] h-[300px] md:w-[650px] md:h-[650px] border-[1.5px] border-dashed border-secondary/40 rounded-full animate-[spin_120s_linear_infinite]"></div>
              <div className="absolute w-[200px] h-[200px] md:w-[450px] md:h-[450px] border border-primary/20 rounded-full"></div>

              {/* Targetting crosshairs */}
              <div className="absolute w-full h-[1px] bg-gradient-to-r from-transparent via-secondary/30 to-transparent"></div>
              <div className="absolute h-full w-[1px] bg-gradient-to-b from-transparent via-primary/30 to-transparent"></div>

              {/* Random floating data boxes */}
              <div className="absolute top-[18%] left-[28%] w-6 h-6 border border-accent/60 flex items-center justify-center mix-blend-multiply">
                 <div className="w-1.5 h-1.5 bg-accent/60 animate-ping"></div>
              </div>
              <div className="absolute bottom-[22%] right-[22%] w-8 h-8 border border-secondary/40 flex items-center justify-center">
                 <div className="w-0.5 h-4 bg-secondary/80"></div>
              </div>
            </div>

            {/* Cube itself — shrinks + fades during zooming; stays full-opacity
                through the cube state so it's the thing the user interacts with. */}
            <div
              className="relative flex items-center justify-center"
              style={{
                opacity: cubeFaded ? 0 : 1,
                transform: cubeFaded ? "scale(0.95)" : "scale(1)",
                transition: "opacity 400ms ease, transform 400ms ease",
                pointerEvents: cubeFaded ? "none" : "auto",
              }}
            >
              <IsometricCube />
            </div>
          </div>

          {/* Right Metrics Panel */}
          <div className={`hidden lg:flex flex-col justify-center h-full w-[40px] relative transition-opacity duration-500 pointer-events-none z-20 ${isMinimized || sidePanelsDimmed ? "opacity-0" : "opacity-100"}`}>
            <div className="flex flex-col items-center gap-12 h-full py-16 justify-between">
              
              <div className="flex-1 w-[1px] bg-border/20 relative">
                <div className="absolute top-[10%] -left-[3px] w-2 h-[1px] bg-foreground/60"></div>
                <div className="absolute top-[40%] -left-[3px] w-2 h-[1px] bg-foreground/60"></div>
                <div className="absolute top-[70%] -left-[3px] w-2 h-[1px] bg-foreground/60"></div>
                <div className="absolute top-[25%] left-[-1.5px] w-[4px] h-12 bg-primary/30"></div>
              </div>
              
              <div className="font-mono text-xs font-bold text-foreground/40 tracking-[0.4em] [writing-mode:vertical-rl] rotate-180 drop-shadow-sm mix-blend-multiply">
                システム警告 // SEC_9
              </div>
              
              <div className="w-3 h-3 border border-foreground/60 flex items-center justify-center">
                 <div className="w-1 h-1 bg-primary"></div>
              </div>
            </div>
          </div>

          {/* Restore Interface Override */}
          {isMinimized && (
            <div className="absolute bottom-12 left-10 z-50">
              <CyberButton
                variant="primary"
                onClick={() => setIsMinimized(false)}
                className="text-xs"
              >
                 <span className="animate-pulse mr-2">!</span> OVERRIDE_RESTORE
              </CyberButton>
            </div>
          )}
          
          {/* Subtle Frame borders */}
          <div className="absolute top-0 left-4 right-4 h-[1px] bg-foreground/10 z-20"></div>
          <div className="absolute bottom-0 left-4 right-4 h-[1px] bg-foreground/10 z-20"></div>
        </section>

      </main>

      <footer className="border-t border-border/30 bg-card/80 backdrop-blur-md px-6 py-4 flex-shrink-0 relative z-30 mt-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 font-mono text-[10px] uppercase font-bold text-muted-foreground">
          <div className="flex items-center gap-4">
            <div className="w-1.5 h-1.5 bg-secondary animate-pulse" />
            <span>© 2025 // SEC_ENCRYPTED</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#" className="hover:text-primary transition-colors flex items-center gap-1 group">
              [<span className="text-foreground group-hover:text-primary transition-colors">GITHUB</span>]
            </a>
            <a href="#" className="hover:text-primary transition-colors flex items-center gap-1 group">
              [<span className="text-foreground group-hover:text-primary transition-colors">LINKEDIN</span>]
            </a>
            <a href="#" className="hover:text-primary transition-colors flex items-center gap-1 group">
              [<span className="text-foreground group-hover:text-primary transition-colors">X</span>]
            </a>
          </div>
        </div>
      </footer>

      {/* MediaPipe Cyberpunk Tracking HUD — landing-only HUD.
          Unmount outside of cube view so the webcam stream + rAF loop
          are released once the user enters the desk scene. */}
      {view === "cube" && <HandTrackerOverlay />}

      </div>
      {/* /DOM landing shell */}

    </div>
  )
}
