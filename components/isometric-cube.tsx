"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"

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
      setRotateY(prev => prev + (targetRotation - prev) * 0.08); // smooth rotation lerp
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
    <div className="relative w-full aspect-square max-w-sm md:max-w-md lg:max-w-lg flex items-center justify-center p-8" style={{ perspective: '1200px' }}>
      
      <style>{`
        .cube-container {
          width: 180px;
          height: 180px;
          transform-style: preserve-3d;
        }
        .cube-face {
          position: absolute;
          inset: 0;
          display: flex;
          backdrop-filter: blur(2px);
        }
        
        .face-front  { transform: translateZ(90px); }
        .face-back   { transform: rotateY(180deg) translateZ(90px); }
        .face-right  { transform: rotateY(90deg) translateZ(90px); }
        .face-left   { transform: rotateY(-90deg) translateZ(90px); }
        .face-top    { transform: rotateX(90deg) translateZ(90px); }
        .face-bottom { transform: rotateX(-90deg) translateZ(90px); }

        @media (min-width: 768px) {
          .cube-container {
            width: 240px;
            height: 240px;
          }
          .face-front  { transform: translateZ(120px); }
          .face-back   { transform: rotateY(180deg) translateZ(120px); }
          .face-right  { transform: rotateY(90deg) translateZ(120px); }
          .face-left   { transform: rotateY(-90deg) translateZ(120px); }
          .face-top    { transform: rotateX(90deg) translateZ(120px); }
          .face-bottom { transform: rotateX(-90deg) translateZ(120px); }
        }

        .glitch-anim {
          animation: glitch 4s infinite;
        }
        
        @keyframes glitch {
          0% { transform: translate(0) }
          1% { transform: translate(-2px, 1px) skewX(1deg) }
          2% { transform: translate(1px, -2px) skewX(-1deg) }
          3% { transform: translate(0) }
          100% { transform: translate(0) }
        }
      `}</style>

      {/* The 3D wrapper that rotates based on cursor */}
      <div className="absolute inset-0 flex items-center justify-center animate-pulse opacity-20 border-[1px] border-primary rounded-full blur-md mix-blend-multiply scale-75 pointer-events-none"></div>

      <motion.div 
        className="cube-container relative cursor-crosshair glitch-anim"
        style={{
          transform: `rotateX(-15deg) rotateY(${rotateY}deg)`,
        }}
      >
        {/* Front Face - Wireframe Data Panel */}
        <div className="cube-face face-front border border-primary/50 bg-background/30 p-2 flex-col items-center justify-center shadow-[0_0_15px_rgba(201,29,34,0.1)]">
          <div className="w-full h-full border border-primary/30 flex flex-col items-start justify-between relative overflow-hidden bg-primary/5">
            <span className="font-mono text-primary text-[10px] md:text-xs pt-1 pl-1 opacity-80">> DATA.STREAM_INIT</span>
            
            <div className="w-full flex-1 flex flex-col items-center justify-center relative z-10">
               <span className="font-mono font-black text-primary text-4xl md:text-5xl tracking-tighter opacity-90 drop-shadow-[0_0_6px_rgba(201,29,34,0.3)]">ONI_01</span>
               {/* Floating yellow/accent squares overlay for glitch flavor */}
               <motion.div 
                 className="absolute w-2 h-2 border border-accent bg-accent/40"
                 animate={{ x: [0, 50, -30, 0], y: [0, -40, 20, 0], opacity: [0,1,0] }}
                 transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
               />
            </div>
            
            <span className="font-mono text-primary-foreground font-bold bg-primary/90 px-2 py-0.5 text-[10px] m-1 self-end mix-blend-multiply">SYS.PROJECTS</span>
            
            {/* Tech crosshairs */}
            <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-primary"></div>
            <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-primary"></div>
          </div>
        </div>
        
        {/* Back Face - Data Grid */}
        <div className="cube-face face-back border border-border/30 bg-card/20 p-2 flex-col items-center justify-center">
          <div className="w-full h-full border border-border/20 grid-pattern flex items-center justify-center text-muted-foreground font-mono text-xs opacity-60 relative">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background/50 mix-blend-overlay"></div>
            [NULL_SECTOR]
            <div className="absolute right-1 top-1 flex flex-col gap-[2px]">
              <div className="w-1 h-3 bg-muted-foreground/80"></div>
              <div className="w-1 h-1 bg-muted-foreground/80"></div>
              <div className="w-1 h-4 bg-muted-foreground/80"></div>
              <div className="w-1 h-1 bg-accent animate-pulse"></div>
            </div>
          </div>
        </div>
        
        {/* Right Face - Jade Terminal */}
        <div className="cube-face face-right border border-secondary/50 bg-secondary/5 p-2 flex-col items-center justify-center shadow-[0_0_15px_rgba(75,110,79,0.1)]">
          <div className="w-full h-full border border-secondary/30 flex flex-col items-end justify-between relative bg-secondary/10">
            <span className="font-mono text-secondary text-[8px] md:text-[10px] pt-1 pr-1 opacity-70">SEC_ID: 104.992</span>
            
            <div className="w-full flex-1 flex items-center justify-center relative">
               <span className="font-mono font-black text-secondary text-4xl md:text-5xl tracking-tighter opacity-90 drop-shadow-[0_0_6px_rgba(75,110,79,0.3)]">ONI_02</span>
            </div>
            
            <div className="flex w-full justify-between items-end p-1">
              <div className="w-1.5 h-1.5 bg-secondary animate-pulse ml-1 mb-1"></div>
              <span className="font-mono text-secondary-foreground font-bold bg-secondary/90 px-2 py-0.5 text-[10px] mix-blend-multiply">ABOUT_USER</span>
            </div>
          </div>
        </div>
        
        {/* Left Face - Concrete Wireframe */}
        <div className="cube-face face-left border border-border/50 bg-card/40 p-2 flex-col items-center justify-center">
           <div className="w-full h-full border border-border/40 flex flex-col items-start justify-center relative bg-muted/20">
             <div className="absolute top-2 left-1 right-1 h-[1px] bg-border/40"></div>
             <div className="absolute top-[14px] left-1 right-1 h-[1px] bg-border/20"></div>
             
             <div className="w-full flex items-center justify-center">
                <span className="font-mono font-black text-foreground text-4xl md:text-5xl tracking-tighter opacity-80 mix-blend-multiply">ONI_03</span>
             </div>
             
             <div className="absolute bottom-1 left-1">
                <span className="font-mono text-foreground font-bold border border-foreground/50 px-2 py-0.5 text-[10px]">CONTACT</span>
             </div>
          </div>
        </div>
        
        {/* Top Face - System Diagnostics */}
        <div className="cube-face face-top border border-accent/50 bg-background/40 items-center justify-center shadow-[inset_0_0_20px_rgba(217,72,51,0.05)]">
          <div className="w-full h-full relative p-3 flex justify-between items-end bg-gradient-to-t from-accent/5 to-transparent">
              <div className="flex flex-col gap-1 opacity-70">
                 <div className="text-[6px] md:text-[8px] font-mono text-foreground border-b border-border/30 w-10 text-right">MEM: 44%</div>
                 <div className="text-[6px] md:text-[8px] font-mono text-foreground border-b border-border/30 w-14 text-right">CPU: 92%</div>
                 <div className="text-[6px] md:text-[8px] font-mono text-foreground border-b border-border/30 w-8 text-right">NET: OK</div>
              </div>
              <div className="font-mono text-accent font-bold text-xl md:text-2xl tracking-[0.2em] [writing-mode:vertical-rl] opacity-80 drop-shadow-sm">
                DIAGNOSTIC
              </div>
          </div>
          <div className="absolute bottom-1 left-1 w-3 h-3 border-l-2 border-b-2 border-accent/60"></div>
          <div className="absolute top-1 right-1 w-3 h-3 border-r-2 border-t-2 border-accent/60"></div>
        </div>
        
        {/* Bottom Face - Radar Drop */}
        <div className="cube-face face-bottom border border-border/20 bg-background/50 overflow-hidden relative backdrop-blur-md">
           <div className="absolute inset-0 grid-pattern opacity-40 mix-blend-multiply"></div>
           <div className="absolute inset-4 border border-dashed border-border/30 rounded-full"></div>
           <div className="absolute inset-8 border border-border/20 rounded-full animate-[spin_30s_linear_infinite]"></div>
        </div>
        
      </motion.div>
    </div>
  )
}
