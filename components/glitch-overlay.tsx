"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"

// A selection of visually interesting tech decals from the 70 available options
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

export function GlitchOverlay() {
  const [decals, setDecals] = useState<GlitchDecal[]>([])

  useEffect(() => {
    // Generate static random positions on client mount to avoid hydration mismatch
    const generateDecals = (): GlitchDecal[] => Array.from({ length: 8 }).map((_, i) => ({
      id: i + Date.now(),
      svgIndex: svgIndices[Math.floor(Math.random() * svgIndices.length)],
      x: 5 + Math.random() * 85, // keep somewhat inside the viewport (5% to 90%)
      y: 5 + Math.random() * 85,
      scale: 0.5 + Math.random() * 2, // varied sizes
      colorType: Math.random() > 0.8 ? "error" : Math.random() > 0.5 ? "background" : "hologram",
      duration: 0.1 + Math.random() * 0.5, // fast flickering
      delay: Math.random() * 4,
    }))
    
    setDecals(generateDecals());
    
    // Periodically scramble them to simulate an unstable ONI shader
    const interval = setInterval(() => {
      setDecals(prev => {
        // Keep some, replace some
        return prev.map(d => Math.random() > 0.7 ? {
          ...d,
          x: Math.random() * 90,
          y: Math.random() * 90,
          svgIndex: svgIndices[Math.floor(Math.random() * svgIndices.length)]
        } : d)
      })
    }, 3000)
    
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden mix-blend-multiply opacity-50">
      <AnimatePresence>
        {decals.map((decal) => (
          <motion.div
            key={decal.id}
            className="absolute flex items-center justify-center"
            style={{
              left: `${decal.x}%`,
              top: `${decal.y}%`,
              width: `${decal.scale * 100}px`,
              height: `${decal.scale * 100}px`,
            }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{
              opacity: [0, 0.6, 0, 0.3, 0],
              scale: [decal.scale, decal.scale * 1.05, decal.scale],
              x: [0, 5, -5, 0] // subtle glitch shift
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
              className={`w-full h-full object-contain filter invert opacity-60 ${
                 decal.colorType === 'error' ? 'sepia saturate-[5] hue-rotate-[-30deg]' : 
                 decal.colorType === 'hologram' ? 'sepia saturate-[3] hue-rotate-[90deg] brightness-50' :
                 'brightness-0'
              }`} 
            />
          </motion.div>
        ))}
      </AnimatePresence>
      
      {/* Heavy CRT scanline overlay mimicking the visual glitches in Marathon ONI */}
      <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(26,26,26,0.03)_3px,rgba(26,26,26,0.03)_5px)] pointer-events-none object-cover mix-blend-overlay opacity-80"></div>
    </div>
  )
}
