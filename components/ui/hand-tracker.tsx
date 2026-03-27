"use client"

import { useHandTracking } from "@/hooks/use-hand-tracking"
import { GlitchText } from "@/components/ui/glitch-text"

export function HandTrackerOverlay() {
  const { isReady, isEggGesture, videoRef } = useHandTracking()

  return (
    <div className="fixed bottom-4 right-4 z-50 border-2 border-primary bg-background/90 p-3 font-mono text-[10px] uppercase text-primary shadow-[4px_4px_0_var(--primary)] backdrop-blur-sm pointer-events-none">
      <div className="flex items-center gap-3 border-b-2 border-primary/30 pb-2 mb-2">
        <div className={`w-2 h-2 ${isReady ? "bg-secondary shadow-[0_0_8px_var(--secondary)] animate-pulse" : "bg-destructive shadow-[0_0_8px_var(--destructive)]"} rounded-full`} />
        <span className="font-bold text-xs tracking-widest">MD_PIPE // {isReady ? "ONLINE" : "BOOTING"}</span>
      </div>
      <div className="flex flex-col gap-1 w-48">
        <div className="flex justify-between items-center">
          <span className="opacity-70">GESTURE:</span>
          {isEggGesture ? <GlitchText text="[EGG_GRIP]" className="text-secondary font-bold" /> : <span className="opacity-50">NONE</span>}
        </div>
        <div className="flex justify-between items-center mt-1">
          <span className="opacity-70">OVR_RIDE:</span>
          {isEggGesture ? <span className="text-secondary font-bold">ENGAGED</span> : <span className="opacity-50">STANDBY</span>}
        </div>
      </div>
    </div>
  )
}
