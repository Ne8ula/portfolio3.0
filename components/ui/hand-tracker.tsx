"use client"

import { useHandTracking } from "@/hooks/use-hand-tracking"
import { GlitchText } from "@/components/ui/glitch-text"

export function HandTrackerOverlay() {
  const { isReady, isEggGesture, videoRef, isEnabled, toggleTracking } = useHandTracking()

  const statusText = !isEnabled ? "OFFLINE" : isReady ? "ONLINE" : "BOOTING"
  const statusColor = !isEnabled ? "bg-muted shadow-[0_0_8px_var(--muted)]" : isReady ? "bg-secondary shadow-[0_0_8px_var(--secondary)] animate-pulse" : "bg-destructive shadow-[0_0_8px_var(--destructive)]"

  return (
    <div className="fixed bottom-4 right-4 z-50 border-2 border-primary bg-background/90 p-3 font-mono text-[10px] uppercase text-primary shadow-[4px_4px_0_var(--primary)] backdrop-blur-sm pointer-events-auto">
      <div className="flex items-center justify-between border-b-2 border-primary/30 pb-2 mb-2 gap-4">
        <div className="flex items-center gap-3">
          <div className={`w-2 h-2 ${statusColor} rounded-full`} />
          <span className="font-bold text-xs tracking-widest">MD_PIPE // {statusText}</span>
        </div>
        <button 
          onClick={toggleTracking} 
          className="border border-primary/50 bg-primary/10 hover:bg-primary/20 hover:border-primary text-primary px-2 py-0.5 text-[10px] uppercase font-bold transition-colors cursor-crosshair active:scale-95"
          title="Toggle Webcam Gesture Tracking"
        >
          {isEnabled ? "DISABLE" : "ENABLE"}
        </button>
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
