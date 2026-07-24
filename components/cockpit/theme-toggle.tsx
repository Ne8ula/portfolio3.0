// @ts-nocheck
"use client"
// ThemeToggle — bottom-right dark/light switch. Ported from Cockpit.html.
import React from "react"

export function ThemeToggle({ theme, onToggle }) {
  const dark = theme === 'dark';
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={dark ? 'switch to light mode' : 'switch to dark mode'}
      style={{
        // bottom clears the ControlsLegend column (~160px tall incl. band padding)
        position: 'fixed', right: 32, bottom: 178, zIndex: 60,
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '9px 14px 9px 12px',
        background: dark ? 'rgba(20,18,24,0.55)' : 'rgba(232,228,220,0.18)',
        backdropFilter: 'blur(14px) saturate(140%)',
        WebkitBackdropFilter: 'blur(14px) saturate(140%)',
        border: `1px solid ${dark ? 'rgba(236,231,218,0.22)' : 'rgba(232,228,220,0.45)'}`,
        boxShadow: '0 8px 24px -10px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)',
        cursor: 'pointer',
        fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 600,
        letterSpacing: '.28em', textTransform: 'uppercase',
        color: 'var(--cream-warm)',
        transition: 'background .25s ease, border-color .25s ease',
      }}
      onMouseOver={(e) => { e.currentTarget.style.borderColor = 'var(--jade-light)'; }}
      onMouseOut={(e) => { e.currentTarget.style.borderColor = dark ? 'rgba(236,231,218,0.22)' : 'rgba(232,228,220,0.45)'; }}
    >
      <span aria-hidden style={{
        position: 'relative', width: 38, height: 18, borderRadius: 999,
        background: dark ? 'rgba(143,184,144,0.22)' : 'rgba(75,110,79,0.28)',
        border: '1px solid rgba(255,255,255,0.18)',
        display: 'inline-block',
      }}>
        <span aria-hidden style={{
          position: 'absolute', left: 4, top: '50%', transform: 'translateY(-50%)',
          fontSize: 9, color: dark ? 'rgba(255,255,255,0.35)' : 'var(--cream-warm)', lineHeight: 1,
        }}>☀</span>
        <span aria-hidden style={{
          position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)',
          fontSize: 9, color: dark ? 'var(--jade-light)' : 'rgba(255,255,255,0.35)', lineHeight: 1,
        }}>☾</span>
        <span aria-hidden style={{
          position: 'absolute', top: 1, left: dark ? 20 : 1,
          width: 14, height: 14, borderRadius: '50%',
          background: dark ? 'var(--jade-light)' : 'var(--cream-warm)',
          boxShadow: '0 1px 2px rgba(0,0,0,0.45), 0 0 8px rgba(122,154,126,0.3)',
          transition: 'left .28s cubic-bezier(.5,.05,.3,1), background .25s ease',
        }}/>
      </span>
      <span style={{ color: 'var(--cream-warm)' }}>{dark ? 'dark' : 'light'}</span>
    </button>
  );
}
