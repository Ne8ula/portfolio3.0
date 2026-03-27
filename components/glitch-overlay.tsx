"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"

// A selection of visually interesting tech decals
const svgIndices = [1, 5, 12, 18, 21, 27, 30, 37, 40, 48, 50, 56, 62, 69]

interface GlitchDecal {
  id: number;
  svgIndex: number;
  x: number;
  y: number;
  scale: number;
  colorType: "hologram" | "error" | "background";
  duration: number;
  delay: number;
}

interface ClickRipple {
  id: number;
  x: number;
  y: number;
}

export function GlitchOverlay() {
  const [decals, setDecals] = useState<GlitchDecal[]>([])
  const [ripples, setRipples] = useState<ClickRipple[]>([])

  useEffect(() => {
    // Generate static random positions on client mount to avoid hydration mismatch
    const generateDecals = (): GlitchDecal[] => Array.from({ length: 15 }).map((_, i) => ({
      id: i + Date.now(),
      svgIndex: svgIndices[Math.floor(Math.random() * svgIndices.length)],
      x: 5 + Math.random() * 85, 
      y: 5 + Math.random() * 85,
      scale: 1 + Math.random() * 4, // extremely varied, some massive
      colorType: Math.random() > 0.8 ? "error" : "background",
      duration: 0.1 + Math.random() * 0.4, 
      delay: Math.random() * 3,
    }))
    
    setDecals(generateDecals());
    
    // Periodically scramble them to simulate an unstable ONI shader
    const interval = setInterval(() => {
      setDecals(prev => {
        return prev.map(d => Math.random() > 0.6 ? {
          ...d,
          x: Math.random() * 90,
          y: Math.random() * 90,
          svgIndex: svgIndices[Math.floor(Math.random() * svgIndices.length)]
        } : d)
      })
    }, 4000)
    
    // Global click listener for shader ripple effect
    const handleClick = (e: MouseEvent) => {
      const newRipple = { id: Date.now(), x: e.clientX, y: e.clientY }
      setRipples(prev => [...prev, newRipple])
      setTimeout(() => {
        setRipples(prev => prev.filter(r => r.id !== newRipple.id))
      }, 1000)
    }
    
    window.addEventListener('click', handleClick)
    
    return () => {
      clearInterval(interval)
      window.removeEventListener('click', handleClick)
    }
  }, [])

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden mix-blend-multiply opacity-100">
      
      {/* Background SVG Decals */}
      <AnimatePresence>
        {decals.map((decal) => (
          <motion.div
            key={decal.id}
            className="absolute flex items-center justify-center opacity-80"
            style={{
              left: `${decal.x}%`,
              top: `${decal.y}%`,
              width: `${decal.scale * 100}px`,
              height: `${decal.scale * 100}px`,
            }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{
              opacity: [0, 0.9, 0, 0.5, 0],
              scale: [decal.scale, decal.scale * 1.05, decal.scale],
              x: [0, 10, -10, 0] // distinct glitch shift
            }}
            exit={{ opacity: 0 }}
            transition={{
              duration: decal.duration,
              repeat: Infinity,
              repeatType: "reverse",
              repeatDelay: decal.delay,
              ease: "circInOut"
            }}
          >
            <img 
              src={`/assets/micrographics/Micrographics Vol.1 - Editable ${decal.svgIndex}.svg`} 
              alt="tech shader decal" 
              className={`w-full h-full object-contain filter invert opacity-90 ${
                 decal.colorType === 'error' ? 'sepia saturate-[6] hue-rotate-[-30deg]' : 
                 'brightness-0'
              }`} 
            />
          </motion.div>
        ))}
      </AnimatePresence>
      
      {/* Click Ripples */}
      <AnimatePresence>
        {ripples.map(ripple => (
          <motion.div
            key={ripple.id}
            className="absolute border-[3px] border-primary mix-blend-multiply"
            style={{ left: ripple.x, top: ripple.y, x: '-50%', y: '-50%' }}
            initial={{ width: 0, height: 0, opacity: 1, rotate: 0 }}
            animate={{ width: 400, height: 400, opacity: 0, rotate: 90 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          >
            <motion.div 
               className="w-full h-full border border-secondary"
               initial={{ scale: 1 }}
               animate={{ scale: 1.5, opacity: 0 }}
               transition={{ duration: 0.5 }}
            />
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Heavy CRT scanline overlay */}
      <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(26,26,26,0.06)_3px,rgba(26,26,26,0.06)_5px)] pointer-events-none object-cover mix-blend-overlay opacity-100"></div>
    </div>
  )
}
