"use client"
// @ts-nocheck
// WarpTransition — ~1.8s trance tunnel between BootScreen and Cockpit.
// Ported verbatim from the Cockpit.html prototype.
import React from "react"

export function WarpTransition({ onComplete }) {
  React.useEffect(() => {
    const t = setTimeout(() => onComplete && onComplete(), 1800);
    return () => clearTimeout(t);
  }, [onComplete]);

  const rings = Array.from({ length: 7 }, (_, i) => i);
  const spokes = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div data-screen-label="00b Warp" style={{
      position: 'fixed', inset: 0, overflow: 'hidden', zIndex: 50,
      background: 'var(--cream)',
      animation: 'warpFinalFade 1.8s ease-in forwards',
      pointerEvents: 'none',
    }}>
      {/* Vertical light streak across the screen — the "stretch" */}
      <div aria-hidden style={{
        position: 'absolute', left: '50%', top: 0, bottom: 0, width: '100vw',
        transform: 'translateX(-50%)',
        background: 'radial-gradient(ellipse 50% 100% at 50% 50%, rgba(75,110,79,0.18), transparent 70%)',
        animation: 'warpStretch 1.8s cubic-bezier(.6,.05,.4,.95) forwards',
        transformOrigin: '50% 50%',
      }}/>

      {/* Rotating spoke field — gives the tunnel motion */}
      <div aria-hidden style={{
        position: 'absolute', left: '50%', top: '50%',
        width: '200vmax', height: '200vmax',
        transform: 'translate(-50%,-50%)',
        animation: 'warpRotate 2.4s linear infinite',
        opacity: 0.55, pointerEvents: 'none',
      }}>
        {spokes.map(i => (
          <div key={i} style={{
            position: 'absolute', left: '50%', top: '50%',
            width: 1, height: '100%',
            background: 'linear-gradient(to bottom, transparent 0%, var(--ink) 48%, var(--ink) 52%, transparent 100%)',
            transformOrigin: '50% 50%',
            transform: `translate(-50%,-50%) rotate(${(i / spokes.length) * 360}deg)`,
            opacity: 0.18,
          }}/>
        ))}
      </div>

      {/* Concentric expanding rings — the warp */}
      {rings.map(i => (
        <div key={i} aria-hidden style={{
          position: 'absolute', left: '50%', top: '50%',
          width: 80, height: 80, borderRadius: '50%',
          border: `1.5px solid var(--jade)`,
          transform: 'translate(-50%,-50%) scale(0.05)',
          animation: `warpRingExpand 1.8s cubic-bezier(.4,.05,.2,1) ${i * 0.12}s forwards`,
          mixBlendMode: 'multiply',
        }}/>
      ))}

      {/* Center text */}
      <div style={{
        position: 'absolute', left: '50%', top: '50%',
        transform: 'translate(-50%,-50%)',
        fontFamily: '"VT323","JetBrains Mono",monospace',
        fontSize: 22, letterSpacing: '.32em', fontWeight: 700,
        color: 'var(--jade-deep)',
        textTransform: 'uppercase', whiteSpace: 'nowrap',
        animation: 'warpShrinkText 1.8s cubic-bezier(.5,.05,.3,1) forwards',
        textAlign: 'center',
      }}>
        — entering the room —
      </div>

      {/* Horizontal sweep line */}
      <div aria-hidden style={{
        position: 'absolute', left: 0, right: 0, top: '50%',
        background: 'var(--jade)',
        transform: 'translateY(-50%)',
        animation: 'warpHorizontalLine 1.8s cubic-bezier(.5,.05,.3,1) forwards',
        opacity: 0,
        boxShadow: '0 0 24px rgba(75,110,79,0.6)',
      }}/>

      {/* Final white flash before reveal */}
      <div aria-hidden style={{
        position: 'absolute', inset: 0,
        background: '#fff',
        animation: 'warpFlash 1.8s ease-in forwards',
        opacity: 0, mixBlendMode: 'screen',
      }}/>

      {/* Scanlines overlay */}
      <div aria-hidden style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'repeating-linear-gradient(to bottom, rgba(30,28,26,0.00) 0 2px, rgba(30,28,26,0.06) 2px 3px)',
        animation: 'termScanRoll 4s linear infinite',
        opacity: 0.7,
      }}/>
    </div>
  );
}
