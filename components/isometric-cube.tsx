"use client"

import { useState, useEffect, useRef } from "react"
import { motion } from "framer-motion"
import { useRouter } from "next/navigation"
import { useHandTracking } from "@/hooks/use-hand-tracking"

export function IsometricCube() {
  const [rotateY, setRotateY] = useState(45)
  const router = useRouter()
  const handTracking = useHandTracking()
  const handRef = useRef({ rotateY: 45, isEgg: false })

  useEffect(() => {
    if (handTracking.rotateY !== null) {
      handRef.current.rotateY = handTracking.rotateY
    }
    handRef.current.isEgg = handTracking.isEggGesture
  }, [handTracking.rotateY, handTracking.isEggGesture])

  useEffect(() => {
    let animationFrameId: number;
    let targetRotation = 45;

    const handleMouseMove = (e: MouseEvent) => {
      if (!handRef.current.isEgg) {
        const xPercent = e.clientX / window.innerWidth
        targetRotation = (xPercent - 0.5) * -220 + 45
      }
    }

    const animate = () => {
      setRotateY(prev => {
        const actualTarget = handRef.current.isEgg ? handRef.current.rotateY : targetRotation
        return prev + (actualTarget - prev) * 0.08
      }); 
      animationFrameId = requestAnimationFrame(animate);
    }

    window.addEventListener("mousemove", handleMouseMove)
    animate();

    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      cancelAnimationFrame(animationFrameId)
    }
  }, [])

  const handleRoute = (path: string) => {
    router.push(path)
  }

  return (
    <div className="relative w-full aspect-square max-w-[300px] md:max-w-[500px] lg:max-w-[650px] flex items-center justify-center p-8" style={{ perspective: '1200px' }}>
      
      <style>{`
        .cube-container {
          width: 240px;
          height: 240px;
          transform-style: preserve-3d;
        }
        .cube-face {
          position: absolute;
          inset: 0;
          display: flex;
          backdrop-filter: blur(2px);
          cursor: crosshair;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .cube-face:hover {
          backdrop-filter: blur(0px);
        }
        
        .face-front  { transform: translateZ(120px); }
        .face-back   { transform: rotateY(180deg) translateZ(120px); }
        .face-right  { transform: rotateY(90deg) translateZ(120px); }
        .face-left   { transform: rotateY(-90deg) translateZ(120px); }
        .face-top    { transform: rotateX(90deg) translateZ(120px); }
        .face-bottom { transform: rotateX(-90deg) translateZ(120px); }

        @media (min-width: 768px) {
          .cube-container {
            width: 340px;
            height: 340px;
          }
          .face-front  { transform: translateZ(170px); }
          .face-back   { transform: rotateY(180deg) translateZ(170px); }
          .face-right  { transform: rotateY(90deg) translateZ(170px); }
          .face-left   { transform: rotateY(-90deg) translateZ(170px); }
          .face-top    { transform: rotateX(90deg) translateZ(170px); }
          .face-bottom { transform: rotateX(-90deg) translateZ(170px); }
        }
      `}</style>

      {/* The 3D wrapper - Removed glitch animation to keep it structurally perfect */}
      <div 
        className="cube-container relative"
        style={{
          transform: `rotateX(-15deg) rotateY(${rotateY}deg)`,
        }}
      >
        {/* Front Face - PROJECTS DATA PANEL */}
        <div 
          className="cube-face face-front border border-primary/40 bg-background/5 p-2 flex-col items-center justify-center hover:bg-primary/10 hover:shadow-[inset_0_0_30px_rgba(201,29,34,0.2)] group"
          onClick={() => handleRoute('/projects')}
        >
          <div className="w-full h-full border border-primary/20 flex flex-col items-start justify-between relative overflow-hidden bg-primary/5 transition-colors">
            <span className="font-mono text-primary text-[10px] md:text-sm pt-2 pl-2 opacity-80 mix-blend-multiply">&gt; DATA.STREAM_INIT</span>
            
            <div className="w-full flex-1 flex flex-col items-center justify-center relative z-10 transition-transform duration-300 group-hover:scale-110">
               <span className="font-mono font-black text-primary text-4xl md:text-6xl tracking-tighter opacity-90 drop-shadow-[0_0_6px_rgba(201,29,34,0.3)]">PROJECTS</span>
            </div>
            
            <span className="font-mono text-primary-foreground font-bold bg-primary/80 px-2 py-0.5 text-xs m-2 self-end mix-blend-multiply">&gt; VIEW_SECTOR</span>
            
            {/* Tech crosshairs expanding on hover */}
            <div className="absolute top-0 left-0 w-4 h-4 border-t border-l border-primary transition-all duration-300 group-hover:w-8 group-hover:h-8 group-hover:border-2"></div>
            <div className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-primary transition-all duration-300 group-hover:w-8 group-hover:h-8 group-hover:border-2"></div>
          </div>
        </div>
        
        {/* Back Face - Data Grid */}
        <div className="cube-face face-back border border-border/30 bg-card/5 p-2 flex-col items-center justify-center">
          <div className="w-full h-full border border-border/20 grid-pattern flex items-center justify-center text-muted-foreground font-mono text-xs opacity-60 relative">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background/50 mix-blend-overlay"></div>
            [NULL_CORE]
          </div>
        </div>
        
        {/* Right Face - ABOUT / JADE TERMINAL */}
        <div 
          className="cube-face face-right border border-secondary/40 bg-secondary/5 p-2 flex-col items-center justify-center hover:bg-secondary/10 hover:shadow-[inset_0_0_30px_rgba(75,110,79,0.2)] group"
          onClick={() => handleRoute('/about')}
        >
          <div className="w-full h-full border border-secondary/20 flex flex-col items-end justify-between relative bg-secondary/5 transition-colors">
            <span className="font-mono text-secondary text-[8px] md:text-xs pt-2 pr-2 opacity-70 mix-blend-multiply">SEC_ID: 104.992</span>
            
            <div className="w-full flex-1 flex items-center justify-center relative transition-transform duration-300 group-hover:scale-110">
               <span className="font-mono font-black text-secondary text-4xl md:text-6xl tracking-tighter opacity-90 drop-shadow-[0_0_6px_rgba(75,110,79,0.3)]">ABOUT</span>
            </div>
            
            <div className="flex w-full justify-between items-end p-2">
              <div className="w-2 h-2 bg-secondary animate-pulse ml-1 mb-1"></div>
              <span className="font-mono text-secondary-foreground font-bold bg-secondary/80 px-2 py-0.5 text-xs mix-blend-multiply">&gt; ACCESS_USER</span>
            </div>
          </div>
        </div>
        
        {/* Left Face - CONTACT / BRUTALISM */}
        <div 
          className="cube-face face-left border border-border/40 bg-card/10 p-2 flex-col items-center justify-center hover:bg-border/10 hover:shadow-[inset_0_0_30px_rgba(26,26,26,0.1)] group"
          onClick={() => handleRoute('/contact')}
        >
           <div className="w-full h-full border border-border/20 flex flex-col items-start justify-center relative bg-muted/10 transition-colors">
             <div className="w-full flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
                <span className="font-mono font-black text-foreground text-4xl md:text-6xl tracking-tighter opacity-80 mix-blend-multiply">CONTACT</span>
             </div>
             
             <div className="absolute bottom-2 left-2">
                <span className="font-mono text-foreground font-bold border border-foreground/50 px-2 py-0.5 text-xs">&gt; CONNECT</span>
             </div>
          </div>
        </div>
        
        {/* Top Face - System Diagnostics */}
        <div className="cube-face face-top border border-accent/20 bg-background/10 items-center justify-center">
          <div className="w-full h-full relative p-4 flex justify-between items-end bg-gradient-to-t from-accent/5 to-transparent">
              <div className="flex flex-col gap-2 opacity-70">
                 <div className="text-[6px] md:text-[10px] font-mono text-foreground border-b border-border/30 w-12 text-right">MEM: 44%</div>
                 <div className="text-[6px] md:text-[10px] font-mono text-foreground border-b border-border/30 w-16 text-right">CPU: 92%</div>
                 <div className="text-[6px] md:text-[10px] font-mono text-foreground border-b border-border/30 w-8 text-right">NET: OK</div>
              </div>
              <div className="font-mono text-accent font-bold text-2xl md:text-3xl tracking-[0.2em] [writing-mode:vertical-rl] opacity-80 drop-shadow-sm">
                DIAGNOSTIC
              </div>
          </div>
        </div>
        
        {/* Bottom Face - Grid Shadow */}
        <div className="cube-face face-bottom border border-border/10 bg-background/20 overflow-hidden relative backdrop-blur-sm">
           <div className="absolute inset-0 grid-pattern opacity-40 mix-blend-multiply"></div>
           <div className="absolute inset-8 border border-dashed border-border/30 rounded-full"></div>
           <div className="absolute inset-16 border border-border/20 rounded-full animate-[spin_30s_linear_infinite]"></div>
        </div>
        
      </div>
    </div>
  )
}
