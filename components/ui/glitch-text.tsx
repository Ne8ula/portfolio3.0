"use client"

import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"

interface GlitchTextProps {
  text: string
  className?: string
  as?: React.ElementType
}

const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+"

export function GlitchText({ text, className, as: Component = "span" }: GlitchTextProps) {
  const [displayText, setDisplayText] = useState(text)
  const [isHovered, setIsHovered] = useState(false)

  useEffect(() => {
    if (!isHovered) {
      setDisplayText(text)
      return
    }

    let iterations = 0
    const interval = setInterval(() => {
      setDisplayText(prev => 
        prev.split("")
          .map((char, index) => {
            if (index < iterations) return text[index]
            return characters[Math.floor(Math.random() * characters.length)]
          })
          .join("")
      )
      
      if (iterations >= text.length) clearInterval(interval)
      iterations += 1 / 3
    }, 30)

    return () => clearInterval(interval)
  }, [isHovered, text])

  return (
    <Component
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn("relative inline-block cursor-default font-mono", className)}
    >
      <motion.span
        animate={{ x: isHovered ? [-2, 2, -1, 1, 0] : 0 }}
        transition={{ duration: 0.2 }}
      >
        {displayText}
      </motion.span>
    </Component>
  )
}
