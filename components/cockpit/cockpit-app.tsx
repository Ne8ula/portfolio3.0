// @ts-nocheck
"use client"
// CockpitApp — the app shell + phase state machine (boot → warp → cockpit).
// Ported from the Cockpit.html prototype's <App/>. The dev Tweaks panel and
// edit-mode postMessage protocol are dropped; the dialed-in TWEAK_DEFAULTS are
// hardcoded and pushed into the live 3D scene once it mounts.
import React, { useState, useEffect, useRef } from "react"
import { BootScreen } from "./boot-screen"
import { WarpTransition } from "./warp-transition"
import { ThemeToggle } from "./theme-toggle"
import { Cockpit } from "./cockpit-hud"
import { CURSOR_DEFAULT } from "./cursors"
import { installTestHooks, registerPhaseController, unregisterPhaseController } from "./test-hooks"
import { useAccessibility } from "@/components/responsive/accessibility-provider"

// Dialed-in transforms from the prototype's TWEAK_DEFAULTS (Cockpit.html).
const TWEAK_DEFAULTS = {
  cubeX: -4, cubeY: 1.62, cubeZ: 1.3,
  // Desk layout: crate LEFT · turntable CENTER · PC (+ keyboard) RIGHT.
  // HIERARCHY: the vinyl pair (turntable + crate) are the heroes — scaled
  // up and center-stage; the PC is a strong secondary pulled right and
  // slightly smaller; coffee stays ambient on the far-left wing; the
  // hobby decorations (decorations.ts) sit well below all four in scale.
  pcX: 5.2, pcY: 0.18, pcZ: 0.0, pcScale: 1.35, pcYaw: -0.55, pcPitch: 0, pcRoll: 0,
  kbX: 0, kbY: 0, kbZ: 0,
  // Seated first-person eye: desk raised toward the camera so the viewer
  // reads as sitting at the desk, not hovering above it.
  fpvHeight: -2.4, fpvDistance: -0.6,
  // Vinyl crate — hero, left of center, records facing the viewer, angled
  // slightly toward the desk center. Moved out to -3.7 so the larger
  // scale can't reach the turntable or the coffee mug.
  vinylX: -3.7, vinylY: 0.18, vinylZ: 1.15, vinylRX: 0, vinylRY: 0.35, vinylRZ: 0, vinylS: 1.7,
  // Turntable — hero, center stage, nudged toward the viewer, dead-on.
  ttX: 0.2, ttY: 0.18, ttZ: 0.9, ttRY: 0, ttS: 1.75,
}

export function CockpitApp({ onMountChange }) {
  const [phase, setPhase] = useState('boot');
  const [interactive, setInteractive] = useState(false);
  // Resolved accessibility state from the root AccessibilityProvider
  // (§A.6.2): live matchMedia + persisted explicit overrides, never a
  // one-time snapshot. `introReady` gates boot timelines on the
  // ACCESSIBILITY trigger being operable (§A.4.3 tier 2).
  const { resolved, introReady } = useAccessibility();
  const reduceMotion = resolved.reducedMotion;
  // Track the 3D view mode so chrome (theme toggle) can hide while the
  // camera is focused on the PC monitor or the vinyl crate.
  const [viewMode, setViewMode] = useState('cockpit');
  useEffect(() => {
    if (onMountChange) onMountChange(true);
    return () => {
      if (onMountChange) onMountChange(false);
    };
  }, [onMountChange]);
  useEffect(() => {
    const onView = (e) => setViewMode(e.detail.mode);
    window.addEventListener('cockpit-view-mode', onView);
    return () => window.removeEventListener('cockpit-view-mode', onView);
  }, []);
  const [theme, setTheme] = useState(() => {
    try {
      const stored = localStorage.getItem('cockpit-theme');
      if (stored === 'light' || stored === 'dark') return stored;
      return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    catch { return 'dark'; }
  });
  const persistThemeRef = useRef(true);
  useEffect(() => {
    const onAppearance = (event) => {
      if (event.detail?.source !== 'appearance-control') return;
      persistThemeRef.current = event.detail.setting !== 'system';
      setTheme(event.detail.theme);
    };
    window.addEventListener('cockpit-theme', onAppearance);
    return () => window.removeEventListener('cockpit-theme', onAppearance);
  }, []);

  const enterRoom = () => {
    if (reduceMotion) {
      setPhase('cockpit');
      setInteractive(true);
      return;
    }
    setPhase('warp');
  };

  // Deterministic test bridge (§9.6.1) — additive to the __cockpit* bridge,
  // no-op in production builds (see test-hooks.ts).
  useEffect(() => {
    installTestHooks();
    registerPhaseController(() => { setPhase('cockpit'); setInteractive(true); });
    return () => unregisterPhaseController();
  }, []);

  // Apply theme to <html data-theme> + broadcast to the 3D scene once the
  // cockpit has mounted — which now happens during the warp, so the room seen
  // through the opening airlock doors already wears the final theme. Boot
  // always renders in the dark palette.
  useEffect(() => {
    if (persistThemeRef.current) {
      try { localStorage.setItem('cockpit-theme', theme); } catch {}
    }
    persistThemeRef.current = true;
    document.documentElement.setAttribute('data-appearance', theme);
    if (phase === 'cockpit' || phase === 'warp') {
      document.documentElement.setAttribute('data-theme', theme);
      window.__cockpitTheme = theme;
      window.dispatchEvent(new CustomEvent('cockpit-theme', { detail: { theme } }));
    } else {
      document.documentElement.removeAttribute('data-theme');
      window.__cockpitTheme = 'dark';
    }
  }, [theme, phase]);

  // Push the hardcoded transforms into the live scene. Keeps re-applying
  // every frame for ~3s: the scene can be rebuilt underneath us (React
  // strict-mode double-mount, HMR) and stray writers have historically
  // repositioned the PC after the first apply — re-asserting for a few
  // seconds guarantees the dialed-in layout wins.
  useEffect(() => {
    if (phase !== 'cockpit' && phase !== 'warp') return;
    let cancelled = false;
    let frames = 0;
    const t = TWEAK_DEFAULTS;
    const apply = () => {
      if (cancelled) return;
      const pc = window.__cockpitPC;
      const kb = window.__cockpitKeyboard;
      const fpv = window.__cockpitFPV;
      const vinyl = window.__cockpitVinyl;
      if (pc && pc.setTransform) {
        pc.setTransform({ x: t.pcX, y: t.pcY, z: t.pcZ, scale: t.pcScale, yaw: t.pcYaw, pitch: t.pcPitch, roll: t.pcRoll });
      }
      if (kb && kb.setOffset) kb.setOffset({ x: t.kbX, y: t.kbY, z: t.kbZ });
      if (fpv && fpv.setOffset) fpv.setOffset({ height: t.fpvHeight, distance: t.fpvDistance });
      if (vinyl && vinyl.setTransform) {
        vinyl.setTransform({ x: t.vinylX, y: t.vinylY, z: t.vinylZ, rx: t.vinylRX, ry: t.vinylRY, rz: t.vinylRZ, s: t.vinylS });
      }
      const tt = window.__cockpitTurntable;
      if (tt && tt.setTransform) {
        tt.setTransform({ x: t.ttX, y: t.ttY, z: t.ttZ, ry: t.ttRY, s: t.ttS });
      }
      frames++;
      if (frames < 180) requestAnimationFrame(apply);
    };
    apply();
    return () => { cancelled = true; };
  }, [phase]);

  return (
    <div
      data-screen-label="01 Cockpit FPS"
      style={{
        position: 'fixed', inset: 0, overflow: 'hidden',
        // one cursor language for every phase — boot terminal included, so
        // the wireframe arrow never hands off to the OS arrow mid-flow
        cursor: CURSOR_DEFAULT,
        background: 'radial-gradient(ellipse at 30% 20%, var(--page-grad-1), var(--page-grad-2) 45%, var(--page-grad-3) 100%)',
      }}
    >
      {phase === 'boot' && introReady && (
        <BootScreen onDone={enterRoom} reduceMotion={reduceMotion} />
      )}
      {phase === 'warp' && (
        <WarpTransition onComplete={() => { setPhase('cockpit'); setInteractive(true); }} />
      )}
      {/* The cockpit mounts UNDER the warp overlay so the real desk shows
          through the opening airlock doors (the warp canvas punches a
          transparent hole in the doorway as the panels part). */}
      {(phase === 'cockpit' || phase === 'warp') && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
          <Cockpit interactive={interactive} />
        </div>
      )}
      <div className="grain" />
      <div className="vignette" />
      {phase === 'cockpit' && viewMode === 'cockpit' && (
        <ThemeToggle theme={theme} onToggle={() => setTheme(t => (t === 'dark' ? 'light' : 'dark'))} />
      )}
    </div>
  );
}
