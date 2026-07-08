"use client"
// @ts-nocheck
// CockpitApp — the app shell + phase state machine (boot → warp → cockpit).
// Ported from the Cockpit.html prototype's <App/>. The dev Tweaks panel and
// edit-mode postMessage protocol are dropped; the dialed-in TWEAK_DEFAULTS are
// hardcoded and pushed into the live 3D scene once it mounts.
import React, { useState, useEffect } from "react"
import { BootScreen } from "./boot-screen"
import { WarpTransition } from "./warp-transition"
import { ThemeToggle } from "./theme-toggle"
import { Cockpit } from "./cockpit-hud"

// Dialed-in transforms from the prototype's TWEAK_DEFAULTS (Cockpit.html).
const TWEAK_DEFAULTS = {
  cubeX: -4, cubeY: 1.62, cubeZ: 1.3,
  // Desk layout: crate LEFT · turntable CENTER · PC (+ keyboard) RIGHT.
  // Items are scaled up and pulled toward the front edge so the desk
  // reads tightly packed from the seated viewpoint.
  pcX: 4.7, pcY: 0.18, pcZ: 0.4, pcScale: 1.5, pcYaw: -0.5, pcPitch: 0, pcRoll: 0,
  kbX: 0, kbY: 0, kbZ: 0,
  // Seated first-person eye: desk raised toward the camera so the viewer
  // reads as sitting at the desk, not hovering above it.
  fpvHeight: -2.4, fpvDistance: -0.6,
  // Vinyl crate — far left, records facing the viewer, angled slightly
  // toward the desk center, pulled forward of the turntable (z 0.8).
  vinylX: -3.2, vinylY: 0.18, vinylZ: 1.15, vinylRX: 0, vinylRY: 0.35, vinylRZ: 0, vinylS: 1.45,
  // Turntable — center, nudged toward the viewer, facing dead-on.
  ttX: 0, ttY: 0.18, ttZ: 0.8, ttRY: 0, ttS: 1.4,
}

export function CockpitApp() {
  const [phase, setPhase] = useState('boot');
  const [interactive, setInteractive] = useState(false);
  // Track the 3D view mode so chrome (theme toggle) can hide while the
  // camera is focused on the PC monitor or the vinyl crate.
  const [viewMode, setViewMode] = useState('cockpit');
  useEffect(() => {
    const onView = (e) => setViewMode(e.detail.mode);
    window.addEventListener('cockpit-view-mode', onView);
    return () => window.removeEventListener('cockpit-view-mode', onView);
  }, []);
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem('cockpit-theme') || 'dark'; }
    catch { return 'dark'; }
  });

  // Apply theme to <html data-theme> + broadcast to the 3D scene, but only
  // once the cockpit has mounted — boot/warp always render in the dark palette.
  useEffect(() => {
    try { localStorage.setItem('cockpit-theme', theme); } catch {}
    if (phase === 'cockpit') {
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
    if (phase !== 'cockpit') return;
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
        background: 'radial-gradient(ellipse at 30% 20%, var(--page-grad-1), var(--page-grad-2) 45%, var(--page-grad-3) 100%)',
      }}
    >
      {phase === 'boot' && <BootScreen onDone={() => setPhase('warp')} />}
      {phase === 'warp' && (
        <WarpTransition onComplete={() => { setPhase('cockpit'); setInteractive(true); }} />
      )}
      {phase === 'cockpit' && (
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
