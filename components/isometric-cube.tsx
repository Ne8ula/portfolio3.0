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
  const isHovered = useRef(false)

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
      // If the user's mouse is hovering the cube, we lock the target rotation 
      // preventing it from spinning away while they try to click a face.
      if (!handRef.current.isEgg && !isHovered.current) {
        const xPercent = e.clientX / window.innerWidth
        // Reverse direction: moving Right (-270 * pos + 45) reveals About (-90deg), Left reveals Contact (180deg).
        targetRotation = (xPercent - 0.5) * -270 + 45
      }
    }

    const animate = () => {
      setRotateY(prev => {
        const actualTarget = handRef.current.isEgg ? handRef.current.rotateY : targetRotation
        // Use an even slower lerp (0.02) to maximize time to reach the hover zone.
        return prev + (actualTarget - prev) * 0.02
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
    <div 
      className="relative w-full aspect-square max-w-[300px] md:max-w-[500px] lg:max-w-[650px] flex items-center justify-center p-8" 
      style={{ perspective: '1200px' }}
      onMouseEnter={() => isHovered.current = true}
      onMouseLeave={() => isHovered.current = false}
    >
      
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
          className="cube-face face-front border border-primary/40 bg-background/5 flex items-center justify-center hover:bg-primary/10 hover:shadow-[inset_0_0_30px_rgba(201,29,34,0.2)] group"
          onClick={() => handleRoute('/projects')}
        >
          <img src="/assets/cube-faces/face-projects.svg" className="w-full h-full object-cover opacity-90 transition-transform duration-300 group-hover:scale-105 mix-blend-multiply" alt="Projects Face" />
        </div>
        
        {/* Back Face - Data Grid */}
        <div className="cube-face face-back border border-border/30 bg-card/5 flex items-center justify-center">
          <img src="/assets/cube-faces/face-core.svg" className="w-full h-full object-cover opacity-70 mix-blend-multiply" alt="Core Face" />
        </div>
        
        {/* Right Face - ABOUT / JADE TERMINAL */}
        <div 
          className="cube-face face-right border border-secondary/40 bg-secondary/5 flex items-center justify-center hover:bg-secondary/10 hover:shadow-[inset_0_0_30px_rgba(75,110,79,0.2)] group"
          onClick={() => handleRoute('/about')}
        >
          <img src="/assets/cube-faces/face-about.svg" className="w-full h-full object-cover opacity-90 transition-transform duration-300 group-hover:scale-105 mix-blend-multiply" alt="About Face" />
        </div>
        
        {/* Left Face - CONTACT / BRUTALISM */}
        <div 
          className="cube-face face-left border border-border/40 bg-card/10 flex items-center justify-center hover:bg-border/10 hover:shadow-[inset_0_0_30px_rgba(26,26,26,0.1)] group"
          onClick={() => handleRoute('/contact')}
        >
           <img src="/assets/cube-faces/face-contact.svg" className="w-full h-full object-cover opacity-90 transition-transform duration-300 group-hover:scale-105 mix-blend-multiply" alt="Contact Face" />
        </div>
        
        {/* Top Face - System Diagnostics */}
        <div className="cube-face face-top border border-accent/20 bg-background/10 items-center justify-center">
          <img src="/assets/cube-faces/face-top.svg" className="w-full h-full object-cover opacity-90 mix-blend-multiply" alt="Top Face" />
        </div>
        
        {/* Bottom Face - Grid Shadow */}
        <div className="cube-face face-bottom border border-border/10 bg-background/20 overflow-hidden relative backdrop-blur-sm">
           <div className="absolute inset-0 grid-pattern opacity-40 mix-blend-multiply"></div>
           <img src="/assets/cube-faces/face-bottom.svg" className="absolute inset-0 w-full h-full object-cover opacity-80 mix-blend-multiply animate-[spin_30s_linear_infinite]" alt="Bottom Face" />
        </div>
        
      </div>
    </div>
  )
}
