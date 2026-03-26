"use client"

import { forwardRef } from "react"
import { cn } from "@/lib/utils"
import { motion, HTMLMotionProps } from "framer-motion"

interface CyberButtonProps extends HTMLMotionProps<"button"> {
  variant?: "primary" | "secondary" | "destructive" | "ghost"
}

export const CyberButton = forwardRef<HTMLButtonElement, CyberButtonProps>(
  ({ className, variant = "primary", children, ...props }, ref) => {
    const baseStyles = "relative font-mono font-bold uppercase tracking-widest transition-all duration-200"
    
    // Using brutalist variants that mesh with our --radius: 0rem CSS scheme
    const variants = {
      primary: "bg-primary text-primary-foreground border-2 border-primary hover:bg-primary/90 hover:shadow-[4px_4px_0px_0px_var(--shadow-color)]",
      secondary: "bg-secondary text-secondary-foreground border-2 border-secondary hover:bg-secondary/80 hover:shadow-[4px_4px_0px_0px_var(--shadow-color)]",
      destructive: "bg-destructive text-destructive-foreground border-2 border-destructive hover:bg-destructive/90 hover:shadow-[4px_4px_0px_0px_var(--shadow-color)]",
      ghost: "bg-transparent text-foreground border-2 border-transparent hover:border-muted",
    }

    return (
      <motion.button
        ref={ref}
        whileHover={{ scale: 1.02, y: -2, x: -2 }}
        whileTap={{ scale: 0.98, y: 0, x: 0 }}
        className={cn(
          baseStyles,
          variants[variant],
          "px-6 py-3 group cursor-crosshair",
          className
        )}
        {...props}
      >
        {/* Subtle corner accent for the Cyberpunk feel */}
        <span className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-current opacity-50 group-hover:opacity-100 transition-opacity" />
        <span className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-current opacity-50 group-hover:opacity-100 transition-opacity" />
        {children}
      </motion.button>
    )
  }
)
CyberButton.displayName = "CyberButton"
