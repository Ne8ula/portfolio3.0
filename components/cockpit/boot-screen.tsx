// @ts-nocheck
"use client"
// BootScreen — cinematic crash → reboot → boot sequence.
// Ported verbatim from the Cockpit.html prototype (BootScreen.jsx).
// Phase-driven timeline; calls onDone() when the user confirms.
import React, { useState, useEffect, useRef } from "react"
import { createRandomSource } from "@/lib/random/seeded-streams"
import { CURSOR_DEFAULT, CURSOR_POINTER } from "./cursors"

// Typewriter hook — reveals `text` char-by-char at `speed` ms/char.
function useTypewriter(text, { start = 0, speed = 35, ready = true } = {}) {
  const [out, setOut] = useState('');
  useEffect(() => {
    if (!ready) { setOut(''); return; }
    let i = 0; let raf; let t0;
    const tick = (ts) => {
      if (!t0) t0 = ts;
      const el = ts - t0 - start;
      if (el < 0) { raf = requestAnimationFrame(tick); return; }
      const want = Math.min(text.length, Math.floor(el / speed));
      if (want !== i) { i = want; setOut(text.slice(0, i)); }
      if (i < text.length) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [text, start, speed, ready]);
  return out;
}

// Random glitch alphabet
const GLITCH_CHARS = '!@#$%^&*<>?/|\\=+-_~`ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789█▓▒░◆◇◈';
const bootGlitchRandom = createRandomSource(null).stream('boot/glitch');
const garbled = (len) => Array.from({ length: len }, () =>
  GLITCH_CHARS[Math.floor(bootGlitchRandom.next() * GLITCH_CHARS.length)]
).join('');

// Scrambling text — random garbage for `corruptMs`, then resolves to `text`.
// `instant` (reduced motion) renders the resolved text with no interval.
function Scramble({ text, corruptMs = 600, tickMs = 45, className, style, instant = false }) {
  const [out, setOut] = useState(() => (instant ? text : garbled(text.length)));
  useEffect(() => {
    if (instant) { setOut(text); return; }
    let elapsed = 0;
    const iv = setInterval(() => {
      elapsed += tickMs;
      if (elapsed >= corruptMs) {
        setOut(text);
        clearInterval(iv);
        return;
      }
      const resolved = Math.floor((elapsed / corruptMs) * text.length);
      setOut(
        text.slice(0, resolved) +
        garbled(Math.max(0, text.length - resolved))
      );
    }, tickMs);
    return () => clearInterval(iv);
  }, [text, corruptMs, tickMs, instant]);
  return <span className={className} style={style}>{out}</span>;
}

// Reduced motion renders the boot terminal directly in its static READY
// state (§A.6.2): no rAF master clock, no cursor/glitch intervals, no
// typewriter or scramble timelines. The authored-dark terminal identity is
// unchanged — only motion is removed.
function BootScreen({ onDone, reduceMotion = false }) {
  // Master timeline in ms — each field is the START of that phase.
  const T = {
    scroll: 200,
    stall: 1300,
    crash: 2200,
    dark: 2550,
    crton: 2850,
    reboot: 3150,
    ready: 4250,
    done: 6200,
  };

  const [now, setNow] = useState(() => (reduceMotion ? T.done + 1 : 0));
  const [cursor, setCursor] = useState(true);
  const [glitchPulse, setGlitchPulse] = useState(0);
  const startRef = useRef(performance.now());

  useEffect(() => {
    if (reduceMotion) {
      // Static ready state — jump the timeline; never start the clock.
      setNow(T.done + 1);
      return;
    }
    let raf;
    const tick = (t) => {
      setNow(t - startRef.current);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduceMotion]);

  // Cursor blink
  useEffect(() => {
    if (reduceMotion) return;
    const iv = setInterval(() => setCursor(c => !c), 440);
    return () => clearInterval(iv);
  }, [reduceMotion]);

  // Periodic brief glitch pulses
  useEffect(() => {
    if (reduceMotion) return;
    const iv = setInterval(() => setGlitchPulse(p => p + 1), 900);
    return () => clearInterval(iv);
  }, [reduceMotion]);

  const phase = (
    now < T.scroll ? 'init' :
    now < T.stall  ? 'scroll' :
    now < T.crash  ? 'stall' :
    now < T.dark   ? 'crash' :
    now < T.crton  ? 'dark' :
    now < T.reboot ? 'crton' :
    now < T.ready  ? 'reboot' :
                     'ready'
  );

  const pad = (n, w = 2) => String(n).padStart(w, '0');
  const hex = (n, w = 4) => n.toString(16).toUpperCase().padStart(w, '0');

  // Log lines streamed during `scroll` phase
  const LOG_LINES = [
    '[  0.0012 ] kernel: portfolio-os v2.6.14 boot',
    '[  0.0023 ] identity: alex xiong · designer · loaded',
    '[  0.0041 ] mem: 32768 MB · case studies cached',
    '[  0.0087 ] dma: 0-7 · routing résumé blocks',
    '[  0.0152 ] pci: bus 0 device 00.0 · about-me bridge',
    '[  0.0193 ] pci: bus 0 device 01.0 gpu · pixels.gl',
    '[  0.0218 ] acpi: caffeine / focus / sleep · ok',
    '[  0.0301 ] usb: hub @ 0x7f12 · 4 side-projects mounted',
    '[  0.0344 ] net: eth0 link up · linkedin · dribbble',
    '[  0.0389 ] fs: mount /work · type case-study-fs',
    '[  0.0412 ] fs: mount /play · 47821 sketches indexed',
    '[  0.0456 ] sec: nda attestation · key 0xAF-2E ok',
    '[  0.0512 ] pipe: design pipeline · 12 stages',
    '[  0.0537 ] shader: typography vs 0x01-0x07 compiled',
    '[  0.0561 ] shader: color-system fs 0x08-0x14 compiled',
    '[  0.0598 ] cube.mod · 6 projects · 3 disciplines',
    '[  0.0624 ] globe: 14 cities · rgba streamed',
    '[  0.0661 ] cockpit.fpv: portfolio camera bound',
    '[  0.0702 ] input: scroll / hover / click connected',
    '[  0.0718 ] audio: lo-fi playlist · muted',
    '[  0.0747 ] timer: deadlines hpet @ 14318180 Hz',
    '[  0.0781 ] rt: ship-it scheduler · quantum 1 ms',
    '[  0.0812 ] idle: weekend states C1..C6 enabled',
    '[  0.0843 ] perf: shipping counters armed',
    '[  0.0876 ] dbg: design-rationale map loaded',
    '[  0.0914 ] portfolio-runtime: handoff → visitor',
    '[  0.0968 ] startup: /sbin/welcome · pid 1',
    '[  0.1012 ] svc: portfolio.service · starting',
    '[  0.1041 ] svc: portfolio.service · resolving case studies',
    '[  0.1088 ] svc: portfolio.service · asking Alex',
    '[  0.1133 ] svc: portfolio.service · warming greeting',
    '[  0.1201 ] svc: portfolio.service · prefetch projects',
    '[  0.1247 ] svc: portfolio.service · hydrate visuals',
    '[  0.1301 ] svc: portfolio.service · ready-ish',
    '[  0.1388 ] █  unexpected idea on vector 0x0D ',
    '[  0.1388 ] ██ creative interrupt at 0x00FA·BE7C ██',
  ];

  // Count how many log lines should be visible by `now`.
  const scrollElapsed = Math.max(0, now - T.scroll);
  const logCount = phase === 'init'
    ? 0
    : phase === 'scroll'
      ? Math.min(LOG_LINES.length, Math.floor(scrollElapsed / 32))
      : LOG_LINES.length;

  const stallCursor = (phase === 'stall' && Math.floor(now / 120) % 2 === 0);

  // Visual configuration for main terminal layer (hidden during dark/crton).
  const mainVisible = phase !== 'dark' && phase !== 'crton';

  // Reboot POST lines — typed during reboot phase
  const POST_STEPS = [
    { label: 'POST ............. ok',   at: T.reboot + 40 },
    { label: 'ROM  checksum .... ok',   at: T.reboot + 140 },
    { label: 'RAM  32768 MB .... ok',   at: T.reboot + 260 },
    { label: 'GPU  AX-GL9800 ... ok',   at: T.reboot + 380 },
    { label: 'FS   mount /      ok',    at: T.reboot + 490 },
    { label: 'NET  link up      ok',    at: T.reboot + 590 },
    { label: 'RT   scheduler    ok',    at: T.reboot + 700 },
    { label: 'AX.RUNTIME ...... ready', at: T.reboot + 820 },
  ];

  const glitchIntensity =
    phase === 'stall' ? 0.35 :
    phase === 'crash' ? 0.9 :
    (glitchPulse % 7 === 0 && phase === 'scroll') ? 0.3 :
    0;

  const jitter = glitchIntensity > 0.05
    ? {
        transform: `translate(${(bootGlitchRandom.next() - 0.5) * 4 * glitchIntensity}px, ${(bootGlitchRandom.next() - 0.5) * 3 * glitchIntensity}px)`,
        textShadow: glitchIntensity > 0.5
          ? `2px 0 rgba(180,60,60,.7), -2px 0 rgba(75,110,79,.7)`
          : 'none',
      }
    : {};

  const noiseBg = {};

  // ───────────── render ─────────────
  return (
    <div
      data-screen-label="00 Boot"
      data-layout-region="boot"
      style={{
        position: 'absolute', inset: 0,
        background: (phase === 'dark' || phase === 'crton') ? '#0a0908' : 'var(--cream)',
        color: 'var(--ink)',
        overflow: 'hidden',
        transition: 'background .15s linear',
      }}
    >
      {/* Scanlines */}
      <div aria-hidden data-boot-decor style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 10,
        background: 'repeating-linear-gradient(to bottom, rgba(30,28,26,0.00) 0 2px, rgba(30,28,26,0.05) 2px 3px)',
        animation: 'termScanRoll 4s linear infinite',
        opacity: phase === 'dark' ? 0.2 : 0.9,
      }}/>

      {/* Rolling horizontal band (CRT rolling bar) */}
      <div aria-hidden data-boot-decor style={{
        position: 'absolute', left: 0, right: 0, height: 80,
        background: 'linear-gradient(to bottom, transparent, rgba(30,28,26,0.08), transparent)',
        pointerEvents: 'none', zIndex: 11,
        animation: 'termBandRoll 6s linear infinite',
        opacity: 0.85,
      }}/>

      {/* Film-grain noise */}
      <div aria-hidden data-boot-decor style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 12,
        backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='1.8' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.12  0 0 0 0 0.11  0 0 0 0 0.10  0 0 0 0.9 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
        backgroundSize: '240px 240px',
        mixBlendMode: 'multiply',
        animation: 'termNoise 0.12s steps(2) infinite',
        opacity: phase === 'stall' ? 0.14 : 0.08,
      }}/>

      {/* ─── MAIN TERMINAL LAYER ─── (hidden during CRT off/on) */}
      {mainVisible && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 4,
          ...noiseBg,
          ...jitter,
          animation: phase === 'crash' ? 'termCrtOff 0.7s forwards' : undefined,
        }}>
          {/* TOP LEFT — header. Skipped in static-ready mode: it is opacity-0
              at `ready` and its typewriters must not start timelines. */}
          {!reduceMotion && (
            <div style={{ position: 'absolute', top: 24, left: 32, opacity: phase === 'ready' ? 0 : 1, transition: 'opacity 0.5s ease-out' }}>
              <HeaderBlock now={now} />
            </div>
          )}

          {/* TOP RIGHT — hardware plate (typewriters — same static-ready skip) */}
          {!reduceMotion && (
            <div style={{ position: 'absolute', top: 24, right: 32, textAlign: 'right', opacity: phase === 'ready' ? 0 : 1, transition: 'opacity 0.5s ease-out' }}>
              <HwPlate now={now} />
            </div>
          )}

          {/* LEFT COLUMN — boot stages */}
          {!reduceMotion && (
            <div style={{ position: 'absolute', top: 110, left: 32, minWidth: 280, opacity: phase === 'ready' ? 0 : 1, transition: 'opacity 0.5s ease-out' }}>
              <StageList phase={phase} now={now} cursor={cursor} />
            </div>
          )}

          {/* CENTER — log stream (during scroll/stall/panic) or POST (reboot). Hidden in ready. */}
          {phase !== 'ready' && (
            <div style={{
              position: 'absolute',
              top: 110, left: '50%', transform: 'translateX(-50%)',
              width: 'min(680px, 60vw)', height: 360, overflow: 'hidden',
              borderTop: '1px dashed var(--ink-faint)',
              borderBottom: '1px dashed var(--ink-faint)',
              padding: '8px 12px',
              background: 'rgba(216,211,199,0.28)',
              transition: 'opacity 0.4s ease-out',
            }}>
              <div className="term-small" style={{ color: 'var(--ink-soft)', marginBottom: 6, letterSpacing: '.12em' }}>
                ▣ /dev/console &nbsp;·&nbsp; {phase === 'reboot' ? 'POST' : 'dmesg'}
              </div>
              {phase === 'reboot' ? (
                <PostStream now={now} steps={POST_STEPS} cursor={cursor} />
              ) : (
                <LogStream lines={LOG_LINES.slice(0, logCount)} stall={stallCursor && logCount === LOG_LINES.length} cursor={cursor} corrupt={phase === 'stall' || phase === 'crash'} />
              )}
            </div>
          )}

          {/* RIGHT COLUMN — registers / bus */}
          {!reduceMotion && (
            <div style={{ position: 'absolute', top: 110, right: 32, textAlign: 'right', minWidth: 260, opacity: phase === 'ready' ? 0 : 1, transition: 'opacity 0.5s ease-out' }}>
              <Registers now={now} hex={hex} pad={pad} phase={phase} />
            </div>
          )}

          {/* CENTER STATE WORD */}
          <div style={{
            position: 'absolute',
            left: '50%',
            ...(phase === 'ready'
              ? { top: '50%', transform: 'translate(-50%, -50%)' }
              : { bottom: 150, transform: 'translateX(-50%)' }),
            textAlign: 'center', width: '100%',
            transition: 'top 0.5s ease-out',
          }}>
            <CenterWord phase={phase} cursor={cursor} instant={reduceMotion} />
            {phase === 'ready' && (
              <div style={{ marginTop: 36, display: 'flex', justifyContent: 'center' }}>
                <ConfirmButton onConfirm={onDone} cursor={cursor} instant={reduceMotion} />
              </div>
            )}
          </div>

          {/* FOOTER — left offset clears the fixed ACCESSIBILITY trigger
              (stage chrome mounted above every phase by app/layout.tsx). */}
          {!reduceMotion && (
            <div style={{
              position: 'absolute', left: 240, right: 32, bottom: 24,
              display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 32,
              opacity: phase === 'ready' ? 0 : 1, transition: 'opacity 0.5s ease-out',
            }}>
              <Footer phase={phase} now={now} pad={pad} />
            </div>
          )}
        </div>
      )}

      {/* ─── CRT OFF/ON OVERLAY ─── */}
      {(phase === 'dark' || phase === 'crton') && (
        <>
          <div aria-hidden style={{
            position: 'absolute', left: '50%', top: '50%',
            width: phase === 'crton' ? 6 : 3,
            height: phase === 'crton' ? 2 : 2,
            transform: 'translate(-50%, -50%)',
            background: '#fff',
            boxShadow: '0 0 24px 8px rgba(255,255,255,0.4)',
            zIndex: 15,
            opacity: phase === 'dark' ? 0.85 : 1,
          }}/>
          {phase === 'crton' && (
            <div aria-hidden style={{
              position: 'absolute', left: 0, right: 0, top: '50%',
              height: Math.max(2, Math.min(80, (now - T.crton) / 10)),
              background: 'rgba(255,255,255,0.12)',
              transform: 'translateY(-50%)',
              zIndex: 14,
              filter: 'blur(1px)',
            }}/>
          )}
        </>
      )}
    </div>
  );
}

// ───────────── sub-components ─────────────

function HeaderBlock({ now }) {
  const t1 = useTypewriter('— 01 .', { start: 20, speed: 22 });
  const t2 = useTypewriter('AX.RUNTIME  v2.6.14', { start: 160, speed: 16 });
  const t3 = useTypewriter('boot // cold-start', { start: 420, speed: 15 });
  return (
    <>
      <div className="term-small" style={{ color: 'var(--ink)' }}>{t1}</div>
      <div className="term-small" style={{ color: 'var(--ink)', marginTop: 2 }}>{t2}</div>
      <div className="term-small" style={{ color: 'var(--ink-soft)', marginTop: 2 }}>{t3}</div>
    </>
  );
}

function HwPlate({ now }) {
  const lines = [
    { t: '§ AXIONG / PORTFOLIO',        s: 60 },
    { t: '§ 2026 ·  Version 0.4',       s: 180 },
    { t: 'host 0xAE71·BC2F',           s: 320 },
    { t: 'User // You',                s: 460 },
  ];
  return (
    <>
      {lines.map((l, i) => (
        <TypedLine key={i} text={l.t} start={l.s} speed={22} color={i < 2 ? 'var(--ink)' : 'var(--ink-soft)'} />
      ))}
    </>
  );
}

function TypedLine({ text, start, speed, color, className = 'term-small' }) {
  const out = useTypewriter(text, { start, speed });
  return (
    <div className={className} style={{ color: color || 'var(--ink)', minHeight: 16 }}>
      {out}
      {out.length > 0 && out.length < text.length && <span style={{ opacity: 0.6 }}>▮</span>}
    </div>
  );
}

function StageList({ phase, now, cursor }) {
  const stages = [
    { t: '.01 > SYS.CORE',          at: 150 },
    { t: '.02 > PORTFOLIO.INIT',    at: 280 },
    { t: '.03 > RENDER.PIPELINE',   at: 450 },
    { t: '.04 > PRODUCT.DESIGN',    at: 700 },
    { t: '.05 > USER.RESEARCH',     at: 900 },
    { t: '.06 > PRODUCT.MANAGEMENT', at: 1100 },
    { t: '.07 > UI // UX',          at: 1260 }, // <-- will stall here
    { t: '.08 > STANDBY',           at: 99999 }, // never reaches before crash
  ];
  const isReboot = phase === 'reboot' || phase === 'ready';
  const stalledIdx = 6;

  return (
    <div>
      <div className="term-small" style={{ color: 'var(--ink-faint)', marginBottom: 8, letterSpacing: '.18em' }}>
        ░ SYS STARTING...
      </div>
      {stages.map((s, i) => {
        let color = 'var(--ink-faint)';
        let suffix = '';
        let label = s.t;
        if (isReboot) {
          color = 'var(--ink)';
          if (i === stages.length - 1) { color = 'var(--jade)'; suffix = ' ◆ ACTIVE'; }
          else suffix = '  · ok';
        } else {
          const visible = now >= s.at;
          if (!visible) { color = 'var(--ink-faint)'; }
          else {
            color = 'var(--ink)';
            const next = stages[i + 1];
            const isActive = !(next && now >= next.at);
            if (isActive) {
              color = 'var(--jade)';
              suffix = ' ' + (cursor ? '█' : ' ');
            } else {
              suffix = '  · ok';
            }
            if (phase !== 'scroll' && i === stalledIdx) {
              color = '#B13A2A';
              suffix = ' ' + (cursor ? '!' : ' ') + '  stall';
            }
          }
        }
        return (
          <div key={i} className="term-small" style={{ color, marginBottom: 3 }}>
            {label}{suffix}
          </div>
        );
      })}
    </div>
  );
}

function Registers({ now, hex, pad, phase }) {
  const t = Math.floor(now / 30);
  const rA = hex((0xA0F1 + t * 3) & 0xFFFF);
  const rB = hex((0x7C2E + t * 7) & 0xFFFF);
  const rC = hex((0x3BA4 + t * 11) & 0xFFFF);
  const rD = hex((0xF017 + t * 13) & 0xFFFF);
  const pc = hex((0x00FABE70 + t * 4) & 0xFFFFFFFF, 8);
  const sp = hex((0x7FFF0E40 - t * 4) & 0xFFFFFFFF, 8);

  return (
    <>
      <div className="term-small" style={{ color: 'var(--ink-faint)', letterSpacing: '.18em', marginBottom: 8 }}>
        ░ REGISTERS
      </div>
      <div className="term-small">ax  {rA}  &nbsp; bx  {rB}</div>
      <div className="term-small">cx  {rC}  &nbsp; dx  {rD}</div>
      <div className="term-small" style={{ marginTop: 6 }}>pc  0x{pc}</div>
      <div className="term-small">sp  0x{sp}</div>
      <div className="term-small" style={{ color: 'var(--ink-soft)', marginTop: 14, letterSpacing: '.18em' }}>░ BUS</div>
      <div className="term-small" style={{ color: phase === 'stall' ? '#B13A2A' : 'var(--ink)' }}>
        irq  {phase === 'stall' ? 'STALL' : 'quiet'}
      </div>
      <div className="term-small">dma  ch2 · 0xB7·14</div>
      <div className="term-small">clk  3.214 GHz</div>
      <div className="term-small" style={{ marginTop: 14, color: 'var(--jade)' }}>
        {phase === 'reboot' || phase === 'ready' ? '◆ POWER · stable' : '◆ POWER · nom'}
      </div>
    </>
  );
}

function LogStream({ lines, stall, cursor, corrupt }) {
  return (
    <div style={{
      fontFamily: '"VT323","JetBrains Mono",monospace',
      fontSize: 13, lineHeight: 1.25, color: 'var(--ink)',
      display: 'flex', flexDirection: 'column-reverse',
      height: 'calc(100% - 22px)', overflow: 'hidden',
    }}>
      <div>
        {lines.map((l, i) => {
          const isLast = i === lines.length - 1;
          const isError = l.startsWith('[  0.1388 ]');
          const style = {
            color: isError ? '#B13A2A' : 'var(--ink)',
            whiteSpace: 'pre',
            fontWeight: isError ? 700 : 400,
          };
          if (corrupt && i > lines.length - 8) {
            return (
              <div key={i} style={{ ...style, color: '#B13A2A' }}>
                {l.split('').map((c, j) => (
                  bootGlitchRandom.next() < 0.25 ? GLITCH_CHARS[(j * i) % GLITCH_CHARS.length] : c
                )).join('')}
              </div>
            );
          }
          return (
            <div key={i} style={style}>
              {l}{isLast && stall && (cursor ? '█' : ' ')}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PostStream({ now, steps, cursor }) {
  return (
    <div style={{ fontFamily: '"VT323","JetBrains Mono",monospace', fontSize: 13, lineHeight: 1.4 }}>
      {steps.map((s, i) => {
        if (now < s.at) return null;
        const revealed = Math.min(s.label.length, Math.floor((now - s.at) / 8));
        const txt = s.label.slice(0, revealed);
        const isOk = s.label.endsWith('ok') || s.label.endsWith('ready');
        return (
          <div key={i} style={{ color: 'var(--ink)' }}>
            <span style={{ color: 'var(--ink-soft)' }}>{'>'} </span>
            {txt}
            {revealed === s.label.length && isOk && <span style={{ color: 'var(--jade)', marginLeft: 6 }}>●</span>}
            {revealed < s.label.length && <span>{cursor ? '█' : ' '}</span>}
          </div>
        );
      })}
    </div>
  );
}

function CenterWord({ phase, cursor, instant = false }) {
  if (phase === 'init' || phase === 'scroll') {
    return (
      <div>
        <div className="term-display" style={{ fontSize: 'clamp(64px, 11vw, 150px)', color: 'var(--ink)', lineHeight: 1 }}>
          [LOADING{cursor ? '_' : ' '}]
        </div>
        <div className="term-small" style={{ color: 'var(--ink-soft)', marginTop: 10, letterSpacing: '.22em' }}>
          PORTFOLIO RUNTIME · COLD BOOT
        </div>
      </div>
    );
  }
  if (phase === 'stall') {
    return (
      <div>
        <div className="term-display" style={{ fontSize: 'clamp(64px, 11vw, 150px)', color: '#B13A2A', lineHeight: 1, animation: 'termJitter 0.12s infinite' }}>
          [STALLED{cursor ? '!' : ' '}]
        </div>
        <div className="term-small" style={{ color: '#B13A2A', marginTop: 10, letterSpacing: '.22em', fontWeight: 700 }}>
          ▲ WATCHDOG TIMEOUT · retry in T-0.7s
        </div>
      </div>
    );
  }
  if (phase === 'crash') {
    return (
      <div>
        <div className="term-display" style={{ fontSize: 'clamp(64px, 11vw, 150px)', color: 'var(--ink-soft)', lineHeight: 1 }}>
          <Scramble text="[···DOWN···]" corruptMs={150} tickMs={25} />
        </div>
      </div>
    );
  }
  if (phase === 'reboot') {
    return (
      <div>
        <div className="term-display" style={{ fontSize: 'clamp(64px, 11vw, 150px)', color: 'var(--ink)', lineHeight: 1 }}>
          <Scramble text="[REBOOTING]" corruptMs={300} tickMs={28} />
        </div>
        <div className="term-small" style={{ color: 'var(--ink-soft)', marginTop: 10, letterSpacing: '.22em' }}>
          WARM START · POST · SELF-TEST
        </div>
      </div>
    );
  }
  // ready
  return (
    <div>
      <div className="term-display" style={{ fontSize: 'clamp(64px, 11vw, 150px)', color: 'var(--ink)', lineHeight: 1 }}>
        <Scramble text="{A_XIONG}" corruptMs={350} tickMs={25} instant={instant} />
      </div>
      <div className="term-small" style={{ color: 'var(--jade)', marginTop: 10, letterSpacing: '.22em', fontWeight: 700 }}>
        ◆ READY · AWAITING CONFIRMATION{cursor ? '_' : ' '}
      </div>
    </div>
  );
}

function ConfirmButton({ onConfirm, cursor, instant = false }) {
  const [hover, setHover] = React.useState(false);
  const [pressed, setPressed] = React.useState(false);
  // Reduced motion: activation is immediate (no pressed-state pause).
  const confirmDelay = instant ? 0 : 180;

  React.useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        // Never hijack activation aimed at another control (e.g. the
        // ACCESSIBILITY trigger or dialog radios).
        const target = e.target;
        if (target instanceof HTMLElement &&
            (target.closest('button, a, input, select, textarea, [role="dialog"]'))) {
          if (!target.closest('[data-hud="boot-enter"]')) return;
        }
        e.preventDefault();
        setPressed(true);
        setTimeout(() => onConfirm && onConfirm(), confirmDelay);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onConfirm, confirmDelay]);

  const click = () => {
    if (pressed) return;
    setPressed(true);
    setTimeout(() => onConfirm && onConfirm(), confirmDelay);
  };

  const Corner = ({ style }) => (
    <span aria-hidden style={{
      position: 'absolute', width: 10, height: 10,
      borderColor: 'var(--jade)', borderStyle: 'solid', borderWidth: 0,
      ...style,
    }}/>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, animation: 'termFadeIn 0.6s ease-out' }}>
      <button
        type="button"
        data-hud="boot-enter"
        onClick={click}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          position: 'relative',
          fontFamily: '"VT323","JetBrains Mono",monospace',
          fontSize: 18, letterSpacing: '.32em', fontWeight: 700,
          textTransform: 'uppercase',
          color: pressed ? 'var(--cream)' : (hover ? 'var(--cream)' : 'var(--jade-deep)'),
          background: pressed ? 'var(--jade-deep)' : (hover ? 'var(--jade)' : 'transparent'),
          border: '1px solid var(--jade)',
          padding: '14px 36px',
          cursor: pressed ? CURSOR_DEFAULT : CURSOR_POINTER,
          transition: 'background .12s linear, color .12s linear, transform .12s ease-out, box-shadow .15s ease-out',
          transform: pressed ? 'translateY(1px)' : (hover ? 'translateY(-1px)' : 'none'),
          boxShadow: hover && !pressed
            ? '0 6px 22px -10px rgba(75,110,79,0.55), inset 0 0 0 1px rgba(75,110,79,0.25)'
            : 'inset 0 0 0 1px rgba(75,110,79,0.18)',
          minWidth: 320,
          outline: 'none',
        }}
      >
        <Corner style={{ top: -1, left: -1, borderTopWidth: 1, borderLeftWidth: 1 }}/>
        <Corner style={{ top: -1, right: -1, borderTopWidth: 1, borderRightWidth: 1 }}/>
        <Corner style={{ bottom: -1, left: -1, borderBottomWidth: 1, borderLeftWidth: 1 }}/>
        <Corner style={{ bottom: -1, right: -1, borderBottomWidth: 1, borderRightWidth: 1 }}/>

        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 12 }}>
          <span style={{ opacity: 0.7 }}>{'>'}</span>
          {pressed ? 'HANDING OFF' : 'ENTER THE ROOM'}
          <span style={{ opacity: cursor ? 1 : 0.15 }}>{pressed ? '_' : '▮'}</span>
        </span>
      </button>

      <div className="term-small" style={{ color: 'var(--ink-soft)', letterSpacing: '.22em', opacity: pressed ? 0.4 : 1, transition: 'opacity .15s linear' }}>
        ⏎  press <span style={{ color: 'var(--ink)', fontWeight: 700 }}>ENTER</span> or click to confirm
      </div>
    </div>
  );
}

function Footer({ phase, now, pad }) {
  const status =
    phase === 'scroll' ? 'BOOTING'  :
    phase === 'stall'  ? 'STALLED'  :
    phase === 'crash'  ? 'SHUTDOWN' :
    phase === 'reboot' ? 'WARM-UP'  :
    phase === 'ready'  ? 'READY'    : 'INIT';
  const pct = Math.min(100, Math.floor(now / 105));
  const ticks = Math.max(3, Math.floor((now / 70) % 22));
  return (
    <>
      <div>
        <div className="term-small" style={{ color: 'var(--ink)' }}>// AX.RUNTIME · console</div>
        <div className="term-small" style={{ color: 'var(--ink-soft)' }}>
          uptime {pad(Math.floor(now / 1000), 2)}.{pad(Math.floor((now % 1000) / 10), 2)}s
        </div>
      </div>
      <div className="term-small" style={{ color: 'var(--ink-soft)', flex: 1, textAlign: 'center' }}>
        ( &nbsp;{'>'.repeat(ticks)}&nbsp; {status} &nbsp;{'<'.repeat(ticks)}&nbsp; )
      </div>
      <div className="term-small" style={{ color: 'var(--ink)', textAlign: 'right' }}>
        <div>state {status}</div>
        <div style={{ color: 'var(--ink-soft)' }}>rdy {pad(pct, 3)}%</div>
      </div>
    </>
  );
}

export { BootScreen }
