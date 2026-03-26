"use client"

import { useState, useEffect } from "react"

export function IsometricCube() {
  const [rotateY, setRotateY] = useState(45)

  useEffect(() => {
    let animationFrameId: number;
    let targetRotation = 45;

    const handleMouseMove = (e: MouseEvent) => {
      const xPercent = e.clientX / window.innerWidth
      targetRotation = (xPercent - 0.5) * -220 + 45
    }

    const animate = () => {
      setRotateY(prev => prev + (targetRotation - prev) * 0.08);
      animationFrameId = requestAnimationFrame(animate);
    }

    window.addEventListener("mousemove", handleMouseMove)
    animate();

    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      cancelAnimationFrame(animationFrameId)
    }
  }, [])

  return (
    <div className="relative w-full aspect-square max-w-sm md:max-w-md lg:max-w-lg flex items-center justify-center" style={{ perspective: '1500px' }}>
      
      <style>{`
        .cube-container {
          width: 200px;
          height: 200px;
          transform-style: preserve-3d;
        }
        .cube-face {
          position: absolute;
          inset: 0;
          display: flex;
        }
        /* Mobile Translations */
        .face-front  { transform: translateZ(100px); }
        .face-back   { transform: rotateY(180deg) translateZ(100px); }
        .face-right  { transform: rotateY(90deg) translateZ(100px); }
        .face-left   { transform: rotateY(-90deg) translateZ(100px); }
        .face-top    { transform: rotateX(90deg) translateZ(100px); }
        .face-bottom { transform: rotateX(-90deg) translateZ(100px); }

        /* Desktop Translations */
        @media (min-width: 768px) {
          .cube-container {
            width: 280px;
            height: 280px;
          }
          .face-front  { transform: translateZ(140px); }
          .face-back   { transform: rotateY(180deg) translateZ(140px); }
          .face-right  { transform: rotateY(90deg) translateZ(140px); }
          .face-left   { transform: rotateY(-90deg) translateZ(140px); }
          .face-top    { transform: rotateX(90deg) translateZ(140px); }
          .face-bottom { transform: rotateX(-90deg) translateZ(140px); }
        }
      `}</style>

      {/* The 3D wrapper that rotates based on cursor */}
      <div 
        className="cube-container relative cursor-crosshair"
        style={{
          transform: `rotateX(-15deg) rotateY(${rotateY}deg)`,
        }}
      >
        {/* Front Face - Imperial Red / Brutalist */}
        <div className="cube-face face-front border-[6px] border-border bg-background p-4 flex-col items-center justify-center">
          <div className="w-full h-full border-4 border-primary grid-pattern flex flex-col items-center justify-center relative overflow-hidden bg-background">
            <span className="font-mono font-black text-primary text-4xl md:text-5xl tracking-tighter z-10">FIG_01</span>
            <span className="font-mono text-primary-foreground mt-2 font-bold bg-primary px-3 py-1 z-10 border-2 border-border shadow-[4px_4px_0px_var(--border)]">PROJECTS</span>
            
            {/* Structural corner accents */}
            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary"></div>
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary"></div>
          </div>
        </div>
        
        {/* Back Face - Framework */}
        <div className="cube-face face-back border-[6px] border-border bg-muted p-2 flex-col items-center justify-center">
          <div className="w-full h-full border-4 border-border/50 grid-pattern flex items-center justify-center text-muted-foreground font-mono font-bold text-sm [writing-mode:vertical-rl]">
            // SECTOR_NULL
          </div>
        </div>
        
        {/* Right Face - Jade Green / Light Tan */}
        <div className="cube-face face-right border-[6px] border-border bg-card p-4 flex-col items-center justify-center">
          <div className="w-full h-full border-4 border-secondary flex flex-col items-center justify-center relative bg-card">
            <span className="font-mono font-black text-secondary text-4xl md:text-5xl tracking-tighter">FIG_02</span>
            <span className="font-mono text-secondary-foreground mt-2 font-bold bg-secondary px-3 py-1 border-2 border-border shadow-[4px_4px_0px_var(--border)]">ABOUT_ME</span>
            
            {/* Blinking scanning dot */}
            <div className="absolute top-2 right-2 w-3 h-3 bg-secondary animate-pulse border-2 border-border"></div>
            <div className="absolute bottom-2 left-2 text-secondary text-xs font-mono font-bold">OK</div>
          </div>
        </div>
        
        {/* Left Face - Concrete Brutalism */}
        <div className="cube-face face-left border-[6px] border-border bg-muted p-4 flex-col items-center justify-center shadow-[-8px_0_0_#1a1a1a]">
           <div className="w-full h-full border-4 border-background flex flex-col items-center justify-center bg-muted">
            <span className="font-mono font-black text-foreground text-4xl md:text-5xl tracking-tighter">FIG_03</span>
            <span className="font-mono text-foreground mt-2 font-bold bg-background px-3 py-1 border-2 border-border">CONTACT</span>
          </div>
        </div>
        
        {/* Top Face - Industrial Warning Stamping */}
        <div className="cube-face face-top border-[6px] border-border bg-primary items-center justify-center">
          <div className="font-mono text-primary-foreground font-bold text-2xl md:text-3xl tracking-[0.4em] [writing-mode:vertical-rl]">
            SYS_OVERRIDE
          </div>
          <div className="absolute top-3 right-3 text-primary-foreground font-mono text-[10px] uppercase font-bold tracking-widest bg-border px-2">V.2025</div>
          <div className="absolute bottom-3 left-3 text-primary-foreground font-mono text-[10px] font-bold">A-12 // X</div>
        </div>
        
        {/* Bottom Face - Empty Framework */}
        <div className="cube-face face-bottom border-[6px] border-border bg-background overflow-hidden relative shadow-[8px_8px_0px_#1a1a1a]">
           <div className="absolute inset-0 grid-pattern opacity-60"></div>
        </div>
        
      </div>
    </div>
  )
}
