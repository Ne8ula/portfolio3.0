// @ts-nocheck
"use client"
// Cockpit HUD — mounts the 3D scene (GlobeCanvas) and all DOM chrome:
// site header, title card, reticle, PC hover brackets, the on-screen
// dialog, and the bottom editorial strip.
// Ported from the Cockpit.html prototype (CockpitHUD.jsx).
// (Weather + automatic geolocation were removed by owner decision,
// 2026-07-28: no geolocation prompt, no third-party weather fetch.)
import React from "react"
import { GlobeCanvas } from "./globe-canvas"
import { CURSOR_DEFAULT, CURSOR_POINTER } from "./cursors"
import { COCKPIT_LAYOUT_CONTRACT } from "@/lib/responsive/layout-contracts"
import { PROJECTS } from "@/lib/projects/catalog"

// CockpitHUD.jsx — editorial cockpit, neutral palette, jade as sole accent.
function Cockpit({ interactive = true }){
  const yawRef = React.useRef(0);
  const pitchRef = React.useRef(0);
  const [viewMode, setViewMode] = React.useState('cockpit');
  const [hoveringPC, setHoveringPC] = React.useState(false);
  const [hoveringCrate, setHoveringCrate] = React.useState(false);

  const stageRef = React.useRef(null);

  // Listen for 3D-scene view-mode + hover events
  React.useEffect(() => {
    const onView = (e) => setViewMode(e.detail.mode);
    const onHover = (e) => setHoveringPC(e.detail.hovering);
    const onCrateHover = (e) => setHoveringCrate(e.detail.hovering);
    window.addEventListener('cockpit-view-mode', onView);
    window.addEventListener('cockpit-hover', onHover);
    window.addEventListener('cockpit-crate-hover', onCrateHover);
    return () => {
      window.removeEventListener('cockpit-view-mode', onView);
      window.removeEventListener('cockpit-hover', onHover);
      window.removeEventListener('cockpit-crate-hover', onCrateHover);
    };
  }, []);

  const exitGlobe = React.useCallback(() => {
    if (window.__setCockpitViewMode) window.__setCockpitViewMode('cockpit');
  }, []);

  // While non-interactive (loader still playing), force view to center and
  // ignore all cursor input. Re-enabled once the parent flips `interactive`.
  React.useEffect(() => {
    if (!interactive){
      yawRef.current = 0;
      pitchRef.current = 0;
    }
  }, [interactive]);

  // FREE mode — mouse position → yaw/pitch. Works in iframes.
  React.useEffect(() => {
    if (!interactive) return;
    const el = stageRef.current;
    if (!el) return;
    const onMove = (e) => {
      const r = el.getBoundingClientRect();
      const nx = ((e.clientX - r.left) / r.width  - 0.5) * 2;
      const ny = ((e.clientY - r.top)  / r.height - 0.5) * 2;
      // In monitor/crate mode, cursor input is used only for gentle
      // parallax (scaled down in Globe.jsx), not full free-look.
      // Free-look: tight range so the camera can never leave the desk —
      // max ±22° yaw, ±15° pitch. Smoothed in Globe.jsx for butter feel.
      const yawScale = viewMode !== 'cockpit' ? 0.25 : (Math.PI * 22/180);
      const pitchScale = viewMode !== 'cockpit' ? 0.15 : (Math.PI * 15/180);
      yawRef.current   = -nx * yawScale;
      pitchRef.current = -ny * pitchScale;
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, [interactive, viewMode]);

  React.useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape' && viewMode !== 'cockpit') exitGlobe();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [exitGlobe, viewMode]);

  return (
    <div ref={stageRef} data-screen-label="02 Cockpit FPS"
      data-layout-region="cockpit-stage"
      data-layout-contract={COCKPIT_LAYOUT_CONTRACT.id}
      // overflow:hidden still scrolls PROGRAMMATICALLY (focus/scrollIntoView
      // against the matrix3d ScreenDialog, which juts far past the viewport)
      // — that silently pans the whole stage. Pin it at 0.
      onScroll={(e) => { e.currentTarget.scrollLeft = 0; e.currentTarget.scrollTop = 0; }}
      style={{position:'absolute',inset:0,overflow:'hidden',background:'var(--scene-bg)',cursor:CURSOR_DEFAULT}}>
      <GlobeCanvas yawRef={yawRef} pitchRef={pitchRef}/>

      {viewMode === 'cockpit' && <ObjectTags/>}
      {viewMode === 'cockpit' && <PCHoverHighlight hovering={hoveringPC}/>}
      {viewMode === 'cockpit' && <CrateHoverHighlight hovering={hoveringCrate}/>}
      {viewMode === 'crate' && <VinylInfoCard/>}
      {viewMode === 'crate' && <VinylBrowseArrows/>}
      {viewMode === 'deck' && <DeckBrowseArrows/>}
      <ScreenDialog interactive={interactive} active={viewMode === 'monitor'}/>
      {viewMode !== 'cockpit' && (
        <div data-hud="return-control" style={{position:'absolute',top:28,right:40,zIndex:90,display:'flex',alignItems:'center',gap:10,color:'var(--cream-deep)',fontFamily:'var(--font-mono)',fontSize:10,letterSpacing:'.22em',textTransform:'uppercase'}}>
          <button onClick={exitGlobe} style={{border:'1px solid var(--mauve)',background:'transparent',color:'var(--cream)',padding:'6px 12px',fontFamily:'var(--font-mono)',fontSize:9,letterSpacing:'.22em',textTransform:'uppercase',cursor:CURSOR_POINTER}}>esc · return</button>
        </div>
      )}

      {/* soft inner-window gradient so the scene feels framed */}
      {viewMode === 'cockpit' && <div style={{position:'absolute',inset:0,pointerEvents:'none',zIndex:3,
        background:'radial-gradient(ellipse at 50% 50%, transparent 35%, rgba(30,28,26,.35) 75%, rgba(30,28,26,.7) 100%)'}}/>}

      {viewMode === 'cockpit' && <>
      {/* Universal site header — full-width bar with identity + nav */}
      <SiteHeader/>

      {/* Title card — sits below the header, on the left */}
      <div style={{position:'absolute',top:120,left:40,zIndex:20,color:'var(--cream)',maxWidth:560}}>
        <h1 style={{margin:0,fontFamily:'var(--font-serif)',fontSize:120,fontWeight:300,letterSpacing:'-.02em',lineHeight:.9,color:'var(--cream-warm)'}}>Alex<br/>Xiong</h1>
        <div style={{marginTop:20,display:'flex',gap:14,alignItems:'center'}}>
          <span style={{width:24,height:1,background:'var(--cream-deep)',display:'inline-block',opacity:.65}}/>
          <span style={{color:'var(--cream-deep)',letterSpacing:'.32em',fontWeight:600,fontFamily:'var(--font-mono)',fontSize:13,textTransform:'uppercase'}}>portfolio · v.2026.04</span>
        </div>
      </div>

      {/* Mid-left vertical label — sits between the name + bottom CLR panel */}
      <div style={{position:'absolute',top:'74%',left:28,transform:'translateY(-50%)',zIndex:20,writingMode:'vertical-rl',fontFamily:'var(--font-mono)',fontSize:9,letterSpacing:'.4em',color:'var(--cream-deep)',textTransform:'uppercase'}}>
        extinguish flame³ · illuminate in ∞
      </div>

      {/* Bottom: editorial layout — CLR mark + stats + meta */}
      <div style={{position:'absolute',left:0,right:0,bottom:0,zIndex:20,padding:'24px 40px 28px',color:'var(--cream)',
        background:'linear-gradient(to top, rgba(30,28,26,.55), rgba(30,28,26,0))'}}>
        <div style={{display:'grid',gridTemplateColumns:'1.2fr 1fr',gap:48,alignItems:'end'}}>
          {/* Desc column */}
          <div>
            <div className="micro" style={{color:'var(--cream-deep)',marginBottom:6}}>crystal clear</div>
            <div style={{fontFamily:'var(--font-mono)',fontSize:11,lineHeight:1.55,color:'var(--cream-deep)',maxWidth:560}}>
              See time like never before. Made of superglass and built to last for life, the Live Globe by Nāie will never stop working.
            </div>
          </div>
          {/* Controls legend — wireframe glyph explanation of the inputs */}
          <ControlsLegend/>
        </div>
      </div>

      </>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// ControlsLegend — bottom-right column beneath the theme toggle:
// wireframe glyphs (same language as the SVG cursor + hover
// brackets) explaining the four inputs. Glyphs animate gently:
// the look-mouse sways, the click-button + hover-brackets pulse
// (softPulse), the ESC keycap presses itself every few seconds.
// ─────────────────────────────────────────────────────────────
function ControlsLegend(){
  const INK  = 'var(--cream-deep)';
  const JADE = 'var(--jade-light)'; // theme-aware: pale jade on dark, deep jade on cream

  // wireframe mouse shell — shared by the look + click glyphs.
  // seam lines split the two buttons, like the cursor's outline style.
  const mouseShell = (
    <>
      <rect x="9.6" y="1.6" width="12.8" height="19.8" rx="6.4" fill="rgba(30,28,26,0.35)" stroke={INK} strokeWidth="1.2"/>
      <line x1="16" y1="1.6" x2="16" y2="9.6" stroke={INK} strokeWidth="1"/>
      <line x1="9.6" y1="9.6" x2="22.4" y2="9.6" stroke={INK} strokeWidth="1"/>
    </>
  );

  const glyphs = {
    look: (
      <svg width="32" height="23" viewBox="0 0 32 23" aria-hidden>
        <polyline points="5,7.5 2,11.5 5,15.5" fill="none" stroke={JADE} strokeWidth="1.2"/>
        <polyline points="27,7.5 30,11.5 27,15.5" fill="none" stroke={JADE} strokeWidth="1.2"/>
        <g style={{animation:'ctrlSway 2.8s ease-in-out infinite'}}>{mouseShell}</g>
      </svg>
    ),
    hover: (
      <svg width="32" height="23" viewBox="0 0 32 23" aria-hidden>
        {/* pulsing jade corner brackets — echoes the real hover highlight */}
        <g fill="none" stroke={JADE} strokeWidth="1.2" style={{animation:'softPulse 1.6s ease-in-out infinite'}}>
          <path d="M4 6 V1.5 H8.5"/><path d="M23.5 1.5 H28 V6"/>
          <path d="M28 17 V21.5 H23.5"/><path d="M8.5 21.5 H4 V17"/>
        </g>
        {/* mini wire-arrow cursor (cursors.ts shape, scaled) */}
        <path d="M12.5 4.5 L12.5 16 L15.7 13 L17.7 17.6 L19.6 16.8 L17.6 12.3 L21.9 12.3 Z"
          fill="rgba(30,28,26,0.4)" stroke="var(--cream-warm)" strokeWidth="1.1" strokeLinejoin="miter"/>
      </svg>
    ),
    click: (
      <svg width="32" height="23" viewBox="0 0 32 23" aria-hidden>
        {mouseShell}
        {/* left button, filled jade + pulsing */}
        <path d="M15.3 2.4 C12.2 2.6 10.4 5.2 10.4 8.2 L10.4 8.9 L15.3 8.9 Z"
          fill={JADE} style={{animation:'softPulse 1.6s ease-in-out infinite'}}/>
      </svg>
    ),
    esc: (
      <svg width="32" height="23" viewBox="0 0 32 23" aria-hidden>
        {/* keycap base (depth edge) + self-pressing top cap */}
        <rect x="7.5" y="4.5" width="20" height="16" fill="none" stroke={INK} strokeWidth="1" opacity=".4"/>
        <g style={{animation:'ctrlKeyPress 3.6s linear infinite'}}>
          <rect x="5.5" y="2" width="20" height="16" fill="rgba(30,28,26,0.35)" stroke={INK} strokeWidth="1.2"/>
          <text x="15.5" y="12.6" textAnchor="middle" fontFamily='"JetBrains Mono", monospace'
            fontSize="6.2" letterSpacing=".1em" fill="var(--cream-warm)">ESC</text>
        </g>
      </svg>
    ),
  };

  const ROWS = [
    { id:'look',  glyph:glyphs.look,  label:'move · look'     },
    { id:'hover', glyph:glyphs.hover, label:'hover · reveal'  },
    { id:'click', glyph:glyphs.click, label:'click · enter'   },
    { id:'esc',   glyph:glyphs.esc,   label:'esc · return'    },
  ];

  // single column — the theme toggle sits above (its `bottom` clears this stack)
  return (
    <div style={{display:'flex', flexDirection:'column', alignItems:'flex-end'}}>
      <div className="micro" style={{color:'var(--cream-deep)',marginBottom:8}}>controls</div>
      <div style={{display:'flex', flexDirection:'column', gap:7}}>
        {ROWS.map(r => (
          <div key={r.id} style={{display:'flex', justifyContent:'flex-end', alignItems:'center', gap:12}}>
            <span style={{fontFamily:'var(--font-mono)', fontSize:9, letterSpacing:'.22em',
              textTransform:'uppercase', color:'var(--cream-deep)', lineHeight:1}}>{r.label}</span>
            <span style={{width:34, display:'flex', justifyContent:'center'}}>{r.glyph}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SiteHeader — universal full-width header.
// A thin top strip that contains: identity slug on the left,
// primary nav on the right, with a hairline rule + corner ticks
// that explicitly bound the header region. Animates in once,
// reacts elegantly on hover, and reveals a sub-menu for Projects.
// ─────────────────────────────────────────────────────────────
function SiteHeader(){
  const [active, setActive] = React.useState('projects');
  const [hovered, setHovered] = React.useState(null);
  const [openSub, setOpenSub] = React.useState(false);
  const closeTimer = React.useRef(null);
  const [time, setTime] = React.useState(() => new Date());

  React.useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000 * 30);
    return () => clearInterval(t);
  }, []);

  // Sub-menu counts derive from the canonical catalog — never invented
  // (DESIGN.md §12; the old "shipped · 12 / in-flight · 04" were fiction).
  const completedCount = PROJECTS.filter((p) => p.status === 'completed').length;
  const inProgressCount = PROJECTS.filter((p) => p.status === 'in-progress').length;
  const pad2 = (n) => String(n).padStart(2, '0');

  const items = [
    { id:'projects', label:'projects', sub:[
      { id:'finished', label:'finished',           hint:`completed · ${pad2(completedCount)}` },
      { id:'wip',      label:'work-in-progress',   hint:`in-progress · ${pad2(inProgressCount)}` },
    ]},
    { id:'designs',  label:'designs' },
    { id:'about',    label:'about' },
    { id:'contact',  label:'contact' },
  ];

  const open = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpenSub(true);
  };
  const scheduleClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpenSub(false), 200);
  };

  const HEADER_H = 78;
  // Local time in user's timezone (HH:MM, 24h) + short tz abbreviation
  const hhmm = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  const tzAbbr = (() => {
    try {
      const parts = new Intl.DateTimeFormat([], { timeZoneName: 'short' }).formatToParts(time);
      const tz = parts.find(p => p.type === 'timeZoneName');
      return tz ? tz.value : '';
    } catch { return ''; }
  })();

  return (
    <header data-hud="site-header" style={{
      position:'absolute', top:0, left:0, right:0,
      height: HEADER_H, zIndex:30,
      pointerEvents:'auto',
      // glassmorphic — frosted ink with subtle inner light + saturation lift
      background:'linear-gradient(to bottom, rgba(232,228,220,0.10) 0%, rgba(30,28,26,0.18) 100%)',
      backdropFilter:'blur(18px) saturate(140%)',
      WebkitBackdropFilter:'blur(18px) saturate(140%)',
      borderBottom:'1px solid rgba(232,228,220,0.14)',
      boxShadow:'inset 0 1px 0 rgba(232,228,220,0.18), inset 0 -1px 0 rgba(30,28,26,0.25), 0 8px 32px -12px rgba(30,28,26,0.45)',
      animation:'termFadeIn .8s ease-out',
    }}>
      {/* Inner highlight sheen — a thin diagonal gloss that sells the glass */}
      <div aria-hidden style={{
        position:'absolute', inset:0, pointerEvents:'none',
        background:'linear-gradient(105deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0) 35%, rgba(255,255,255,0) 70%, rgba(255,255,255,0.04) 100%)',
        mixBlendMode:'overlay',
      }}/>
      {/* Subtle noise so the glass has texture, not pure blur */}
      <div aria-hidden style={{
        position:'absolute', inset:0, pointerEvents:'none', opacity:0.18,
        backgroundImage:"url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.95  0 0 0 0 0.93  0 0 0 0 0.88  0 0 0 0.5 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
        backgroundSize:'180px 180px',
        mixBlendMode:'overlay',
      }}/>
      {/* Corner ticks — bound the header region */}
      <CornerTick pos="tl"/>
      <CornerTick pos="tr"/>

      <div style={{
        position:'absolute', inset:0,
        padding:'0 40px',
        display:'flex', alignItems:'center', justifyContent:'space-between',
        gap:24,
      }}>
        {/* LEFT — horizontal logo lockup, expanded with graphic elements */}
        <div style={{
          display:'flex', alignItems:'center', gap:14,
          textDecoration:'none',
          color:'var(--cream-warm)',
          position:'relative',
        }}>
          {/* ── Monogram — minimal AX glyph ── */}
          <svg aria-hidden width="28" height="28" viewBox="0 0 38 38" style={{display:'block', flexShrink:0}}>
            <path d="M 19 8 L 29 28 L 9 28 Z"
              fill="none" stroke="var(--cream-warm)" strokeWidth="1.6" strokeLinejoin="miter"/>
            <line x1="12" y1="12" x2="26" y2="28" stroke="var(--jade)" strokeWidth="1.3"/>
            <line x1="26" y1="12" x2="12" y2="28" stroke="var(--jade)" strokeWidth="1.3"/>
          </svg>

          {/* ── Wordmark — one quiet line ── */}
          <span style={{display:'inline-flex', alignItems:'baseline', gap:8}}>
            <span style={{
              fontFamily:'var(--font-serif)', fontSize:22, fontWeight:400,
              lineHeight:1, letterSpacing:'-.02em',
              color:'var(--cream-warm)', fontStyle:'italic',
            }}>A</span>
            <span aria-hidden style={{
              width:1, height:14, background:'var(--cream-deep)', opacity:.4,
              alignSelf:'center',
            }}/>
            <span style={{
              fontFamily:'var(--font-mono)', fontSize:13, fontWeight:600,
              letterSpacing:'.3em', textTransform:'uppercase',
              color:'var(--cream-warm)',
            }}>xiong</span>
            <span style={{
              fontFamily:'var(--font-serif)', fontSize:12, fontStyle:'italic',
              color:'var(--cream-deep)', opacity:.8, marginLeft:2,
            }}>studio</span>
          </span>

        </div>

        {/* RIGHT — primary nav + meta */}
        <nav style={{display:'flex', alignItems:'center', gap:0}}>
          {items.map((it, idx) => {
            const isActive = active === it.id;
            const isHover  = hovered === it.id;
            const isProjects = it.id === 'projects';
            return (
              <div
                key={it.id}
                onMouseEnter={() => { setHovered(it.id); if (isProjects) open(); }}
                onMouseLeave={() => { setHovered(null); if (isProjects) scheduleClose(); }}
                style={{position:'relative', padding:'0 18px'}}
              >
                <button
                  type="button"
                  onClick={() => setActive(it.id)}
                  aria-expanded={isProjects ? openSub : undefined}
                  aria-haspopup={isProjects ? 'menu' : undefined}
                  style={{
                    background:'transparent', border:'none', padding:'6px 0',
                    cursor:CURSOR_POINTER,
                    fontFamily:'var(--font-mono)',
                    fontSize: 13, letterSpacing:'.26em', textTransform:'uppercase',
                    fontWeight: isActive ? 700 : 500,
                    color: isActive ? 'var(--jade-light)' : (isHover ? 'var(--cream-warm)' : 'var(--cream-deep)'),
                    transition:'color .2s ease',
                    position:'relative',
                    display:'flex', alignItems:'center', gap:6,
                  }}
                >
                  {/* number prefix — editorial ledger feel */}
                  <span aria-hidden style={{
                    fontSize:10, opacity: isActive ? .85 : .55,
                    color:'currentColor', fontWeight:400,
                    letterSpacing:'.2em',
                  }}>0{idx+1}</span>
                  {it.label}
                  {isProjects && (
                    <span aria-hidden style={{
                      marginLeft:2, fontSize:7, opacity:.55,
                      transform: openSub ? 'rotate(180deg)' : 'rotate(0)',
                      transition:'transform .2s ease',
                      display:'inline-block',
                    }}>▾</span>
                  )}

                  {/* underline track — animates from center on hover, jade when active */}
                  <span aria-hidden style={{
                    position:'absolute', bottom:0, left:0, right:0, height:1,
                    background:'currentColor', opacity: isActive ? .9 : (isHover ? .35 : 0),
                    transform: isActive || isHover ? 'scaleX(1)' : 'scaleX(0)',
                    transformOrigin:'center',
                    transition:'transform .25s ease, opacity .25s ease',
                  }}/>
                </button>

                {/* Projects sub-menu — renders above the header rule */}
                {isProjects && openSub && (
                  <div
                    onMouseEnter={open}
                    onMouseLeave={scheduleClose}
                    style={{
                      position:'absolute', top: 'calc(100% + 14px)', left:8,
                      minWidth: 240, zIndex: 50,
                      background:'rgba(30,28,26,0.96)',
                      backdropFilter:'blur(10px)',
                      border:'1px solid rgba(232,228,220,0.22)',
                      padding:'14px 16px 16px',
                      animation:'termFadeIn .22s ease-out',
                      boxShadow:'0 24px 60px -20px rgba(0,0,0,0.7)',
                      color:'var(--cream-warm)',
                    }}
                  >
                    {/* small caret */}
                    <div aria-hidden style={{
                      position:'absolute', top:-5, left:24, width:8, height:8,
                      background:'rgba(30,28,26,0.96)',
                      borderLeft:'1px solid rgba(232,228,220,0.22)',
                      borderTop:'1px solid rgba(232,228,220,0.22)',
                      transform:'rotate(45deg)',
                    }}/>
                    <div className="micro" style={{
                      color:'var(--cream-deep)', opacity:.55,
                      fontSize:8, letterSpacing:'.3em', marginBottom:10,
                    }}>
                      ── subset · 02
                    </div>
                    <div style={{display:'flex', flexDirection:'column'}}>
                      {it.sub.map((s, sIdx) => (
                        <button
                          type="button"
                          key={s.id}
                          onClick={() => { setActive(it.id); setOpenSub(false); }}
                          style={{
                            background:'transparent', border:'none',
                            padding:'10px 0', cursor:CURSOR_POINTER, textAlign:'left',
                            fontFamily:'var(--font-mono)',
                            display:'flex', alignItems:'baseline',
                            justifyContent:'space-between', gap:14,
                            borderTop: sIdx === 0 ? 'none' : '1px dotted rgba(232,228,220,0.14)',
                            color:'var(--cream-warm)',
                            transition:'color .15s ease',
                          }}
                          onMouseOver={(e)=>{
                            e.currentTarget.style.color='var(--jade-light)';
                            const dot = e.currentTarget.querySelector('[data-dot]');
                            if (dot){ dot.style.opacity = '1'; dot.style.background='var(--jade)'; }
                            const hint = e.currentTarget.querySelector('[data-hint]');
                            if (hint) hint.style.color = 'var(--jade-light)';
                          }}
                          onMouseOut={(e)=>{
                            e.currentTarget.style.color='var(--cream-warm)';
                            const dot = e.currentTarget.querySelector('[data-dot]');
                            if (dot){ dot.style.opacity = '.5'; dot.style.background='var(--cream-deep)'; }
                            const hint = e.currentTarget.querySelector('[data-hint]');
                            if (hint) hint.style.color = 'var(--cream-deep)';
                          }}
                        >
                          <span style={{
                            fontSize:11, letterSpacing:'.18em', textTransform:'uppercase',
                            color:'inherit', fontWeight:500,
                            display:'flex', alignItems:'center', gap:12,
                          }}>
                            <span data-dot aria-hidden style={{
                              width:5, height:5, background:'var(--cream-deep)',
                              display:'inline-block', opacity:.5,
                              transition:'opacity .15s ease, background .15s ease',
                            }}/>
                            {s.label}
                          </span>
                          <span data-hint style={{
                            fontSize:9, color:'var(--cream-deep)', opacity:.7,
                            letterSpacing:'.2em', textTransform:'uppercase',
                            transition:'color .15s ease',
                          }}>
                            {s.hint}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Vertical divider */}
          <div aria-hidden style={{
            width:1, height:18, background:'var(--cream-deep)', opacity:.25,
            margin:'0 18px 0 22px',
          }}/>

          {/* Status cluster */}
          <div style={{
            display:'flex', alignItems:'center', gap:10,
            color:'var(--cream-deep)',
            fontFamily:'var(--font-mono)', fontSize:9, letterSpacing:'.22em',
            textTransform:'uppercase',
          }}>
            <span style={{
              width:6, height:6, background:'var(--jade)',
              borderRadius:'50%',
              animation:'softPulse 1.8s infinite',
            }}/>
            <span style={{fontSize:12, letterSpacing:'.24em', fontWeight:500}}>{hhmm}{tzAbbr ? ` · ${tzAbbr}` : ''}</span>
          </div>
        </nav>
      </div>

      {/* Hairline rule — explicitly bounds the header */}
      <div aria-hidden style={{
        position:'absolute', left:40, right:40, bottom:0, height:1, zIndex:1,
        background:'linear-gradient(to right, transparent 0%, rgba(232,228,220,0.45) 12%, rgba(232,228,220,0.45) 88%, transparent 100%)',
        mixBlendMode:'screen',
      }}/>
      {/* Jade tracker tick under active item — drawn relative to header */}
    </header>
  );
}

function CornerTick({ pos }){
  const map = {
    tl:{ top:10,    left:10,   borderTop:'1px solid var(--cream-deep)', borderLeft:'1px solid var(--cream-deep)' },
    tr:{ top:10,    right:10,  borderTop:'1px solid var(--cream-deep)', borderRight:'1px solid var(--cream-deep)' },
    bl:{ bottom:10, left:10,   borderBottom:'1px solid var(--cream-deep)', borderLeft:'1px solid var(--cream-deep)' },
    br:{ bottom:10, right:10,  borderBottom:'1px solid var(--cream-deep)', borderRight:'1px solid var(--cream-deep)' },
  };
  return (
    <span aria-hidden style={{
      position:'absolute', width:10, height:10, opacity:.5,
      ...map[pos],
    }}/>
  );
}

// ─────────────────────────────────────────────────────────────
// ObjectTags — small editorial name tags floated above the four
// interactive heroes (OBJECT · PURPOSE). A tag appears ONLY while
// its object is hovered (window.__cockpitHoveredTag, set by the
// scene's hover raycast — crate via its own picking — alongside
// the edge glow). Anchors come from window.__getCockpitAnchors();
// tags render only in cockpit view. PC/crate show their tag AND
// their hover brackets together.
// ─────────────────────────────────────────────────────────────
const TAG_LABELS = {
  pc:        { name: 'AX-01',        role: 'chatbot' },
  crate:     { name: 'vinyl crate',  role: 'portfolio' },
  turntable: { name: 'vinyl player', role: 'portfolio selection' },
  coffee:    { name: 'coffee',       role: 'intermission' },
};

function ObjectTags(){
  const [anchors, setAnchors] = React.useState(null);
  const [hovered, setHovered] = React.useState(null);
  React.useEffect(() => {
    let raf;
    const tick = () => {
      const a = window.__getCockpitAnchors && window.__getCockpitAnchors();
      setAnchors(a);
      setHovered(window.__cockpitHoveredTag || null);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  if (!anchors) return null;
  return (
    <div style={{position:'absolute', inset:0, zIndex:13, pointerEvents:'none', overflow:'hidden'}}>
      {anchors.map(({ id, x, y }) => {
        const label = TAG_LABELS[id];
        if (!label) return null;
        if (id !== hovered) return null;             // tags are hover-only
        return (
          <div key={id} style={{
            position:'absolute', left: x, top: y,
            transform:'translate(-50%, -100%)',
            display:'flex', flexDirection:'column', alignItems:'center',
            animation:'tagFadeIn .35s ease-out',
          }}>
            <div style={{
              display:'flex', alignItems:'center', gap:8,
              padding:'5px 10px 6px',
              background:'rgba(30,28,26,0.58)',
              backdropFilter:'blur(6px)',
              WebkitBackdropFilter:'blur(6px)',
              border:'1px solid rgba(232,228,220,0.16)',
              fontFamily:'var(--font-mono)', fontSize:9, fontWeight:600,
              letterSpacing:'.22em', textTransform:'uppercase',
              whiteSpace:'nowrap',
            }}>
              <span style={{color:'var(--jade-light)'}}>{label.name}</span>
              <span aria-hidden style={{width:3, height:3, background:'var(--jade)', display:'inline-block'}}/>
              <span style={{color:'var(--cream-deep)', fontWeight:500}}>{label.role}</span>
            </div>
            {/* connector tick down toward the object */}
            <span aria-hidden style={{width:1, height:10, background:'rgba(232,228,220,0.35)'}}/>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// PCHoverHighlight — jade corner brackets that track the PC's
// screen-space bounding box when the cursor is over it.
// ─────────────────────────────────────────────────────────────
function PCHoverHighlight({ hovering }){
  const [rect, setRect] = React.useState(null);
  React.useEffect(() => {
    let raf;
    const tick = () => {
      const r = window.__getCockpitPCRect && window.__getCockpitPCRect();
      setRect(r);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  if (!rect || !hovering) return null;
  const pad = 12;
  const { x, y, w, h } = rect;
  if (w < 10 || h < 10) return null;
  const L = x - pad, T = y - pad, R = x + w + pad, B = y + h + pad;
  const bracketLen = Math.max(22, Math.min(48, Math.min(w, h) * 0.14));
  const strokeW = 1.5;
  const jade = '#9BC4A1';
  const mkBracket = (cx, cy, dx, dy) => (
    <>
      <line x1={cx} y1={cy} x2={cx + bracketLen*dx} y2={cy} stroke={jade} strokeWidth={strokeW}/>
      <line x1={cx} y1={cy} x2={cx} y2={cy + bracketLen*dy} stroke={jade} strokeWidth={strokeW}/>
    </>
  );
  return (
    <svg style={{
      position:'absolute', inset:0, zIndex:14, pointerEvents:'none',
      animation:'softPulse 1.6s ease-in-out infinite'
    }}>
      {mkBracket(L, T, 1, 1)}
      {mkBracket(R, T, -1, 1)}
      {mkBracket(L, B, 1, -1)}
      {mkBracket(R, B, -1, -1)}
      {/* center mini-reticle */}
      <circle cx={(L+R)/2} cy={(T+B)/2} r={3} fill={jade}/>
      {/* label */}
      <text x={L} y={T - 6}
        fontFamily='"JetBrains Mono", monospace' fontSize={10}
        letterSpacing=".18em" fill={jade} style={{textTransform:'uppercase'}}>
        AX/OS · CLICK TO ENTER
      </text>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────
// CrateHoverHighlight — same bracket treatment as the PC, but
// tracking the vinyl crate's bounding box ('cockpit-crate-hover').
// ─────────────────────────────────────────────────────────────
function CrateHoverHighlight({ hovering }){
  const [rect, setRect] = React.useState(null);
  React.useEffect(() => {
    let raf;
    const tick = () => {
      const r = window.__getCockpitCrateRect && window.__getCockpitCrateRect();
      setRect(r);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  if (!rect || !hovering) return null;
  const pad = 12;
  const { x, y, w, h } = rect;
  if (w < 10 || h < 10) return null;
  const L = x - pad, T = y - pad, R = x + w + pad, B = y + h + pad;
  const bracketLen = Math.max(22, Math.min(48, Math.min(w, h) * 0.14));
  const strokeW = 1.5;
  const jade = '#9BC4A1';
  const mkBracket = (cx, cy, dx, dy) => (
    <>
      <line x1={cx} y1={cy} x2={cx + bracketLen*dx} y2={cy} stroke={jade} strokeWidth={strokeW}/>
      <line x1={cx} y1={cy} x2={cx} y2={cy + bracketLen*dy} stroke={jade} strokeWidth={strokeW}/>
    </>
  );
  return (
    <svg style={{
      position:'absolute', inset:0, zIndex:14, pointerEvents:'none',
      animation:'softPulse 1.6s ease-in-out infinite'
    }}>
      {mkBracket(L, T, 1, 1)}
      {mkBracket(R, T, -1, 1)}
      {mkBracket(L, B, 1, -1)}
      {mkBracket(R, B, -1, -1)}
      <circle cx={(L+R)/2} cy={(T+B)/2} r={3} fill={jade}/>
      <text x={L} y={T - 6}
        fontFamily='"JetBrains Mono", monospace' fontSize={10}
        letterSpacing=".18em" fill={jade} style={{textTransform:'uppercase'}}>
        ARCHIVE · CLICK TO BROWSE
      </text>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────
// VinylInfoCard — editorial card that floats above the hovered
// record while browsing the crate. Polls the hover projection
// exposed by vinyl-crate.ts each frame.
// ─────────────────────────────────────────────────────────────
function VinylInfoCard(){
  const [info, setInfo] = React.useState(null);
  React.useEffect(() => {
    let raf;
    const tick = () => {
      const h = window.__getCockpitVinylHover && window.__getCockpitVinylHover();
      setInfo(h || null);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  if (!info) return null;
  // Fixed bottom-center placard — under the bin, deliberately OFF the
  // record so the pulled sleeve is never covered by its own caption.
  return (
    <div data-hud="vinyl-info-card" style={{
      position:'absolute', left:'50%', bottom: 44,
      transform:'translateX(-50%)',
      zIndex:16, pointerEvents:'none',
    }}>
      <div style={{
        textAlign:'center',
        background:'rgba(30,28,26,0.88)',
        backdropFilter:'blur(8px)',
        border:'1px solid rgba(232,228,220,0.22)',
        boxShadow:'0 18px 48px -18px rgba(0,0,0,0.65)',
        padding:'12px 18px 13px',
        minWidth:180, maxWidth:300,
        animation:'termFadeIn .18s ease-out',
      }}>
        {/* micro header — index · category · date */}
        <div style={{
          fontFamily:'var(--font-mono)', fontSize:9, fontWeight:600,
          letterSpacing:'.26em', textTransform:'uppercase',
          color:'var(--jade-light)', marginBottom:6,
          display:'flex', alignItems:'center', justifyContent:'center', gap:8,
        }}>
          <span style={{color:'var(--cream-deep)'}}>n° {String(info.index+1).padStart(2,'0')}</span>
          <span style={{width:3, height:3, background:'var(--jade)', display:'inline-block'}}/>
          <span>{info.category}</span>
          <span style={{color:'var(--cream-deep)'}}>· {info.date}</span>
        </div>
        {/* title */}
        <div style={{
          fontFamily:'var(--font-serif)', fontSize:24, fontWeight:400,
          letterSpacing:'-.01em', lineHeight:1.05,
          color:'var(--cream-warm)',
        }}>{info.title}</div>
        {/* jade rule */}
        <div style={{marginTop:9}}>
          <span style={{width:26, height:1, background:'var(--jade)', display:'inline-block'}}/>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// BrowseArrows — shared ◄/► record stepper. In crate view they
// appear while a record is pulled out (info from
// __getCockpitVinylHover); in deck view while a record plays on
// the turntable (info from __getCockpitDeckInfo — also disabled
// mid-flight via info.busy). Both step through
// window.__cockpitVinylSelect(±1), clamped by index/count.
// ─────────────────────────────────────────────────────────────
function VinylBrowseArrows(){
  const getInfo = React.useCallback(
    () => window.__getCockpitVinylHover && window.__getCockpitVinylHover(), []);
  return <BrowseArrows getInfo={getInfo} hint="◄ ► to browse · click away to return"/>;
}

function DeckBrowseArrows(){
  const getInfo = React.useCallback(
    () => window.__getCockpitDeckInfo && window.__getCockpitDeckInfo(), []);
  const getRect = React.useCallback(
    () => window.__getCockpitDeckCardRect && window.__getCockpitDeckCardRect(), []);
  return <BrowseArrows getInfo={getInfo} getRect={getRect} hint="◄ ► to browse · esc to return"/>;
}

function BrowseArrows({ getInfo, getRect, hint }){
  const [info, setInfo] = React.useState(null);
  const [rect, setRect] = React.useState(null);
  React.useEffect(() => {
    let raf;
    const tick = () => {
      setInfo(getInfo() || null);
      // hold the last rect while the card blinks out mid-swap — the
      // arrows shouldn't bounce to the viewport edges and back
      const next = (getRect && getRect()) || null;
      setRect(prev => next || prev);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [getInfo, getRect]);
  if (!info) return null;
  const step = (d) => window.__cockpitVinylSelect && window.__cockpitVinylSelect(d);
  // With a tracked rect (deck view: the holo card) the arrows hug its
  // sides; otherwise they park at the viewport edges (crate view).
  const anchor = (side) => rect
    ? { left: side === 'left' ? Math.max(8, rect.x - 60) : Math.min(window.innerWidth - 56, rect.x + rect.w + 14),
        top: rect.y + rect.h / 2 }
    : { [side]: 36, top: '50%' };
  const arrow = (side, glyph, delta, disabled) => (
    <div data-hud={delta < 0 ? 'browse-arrow-prev' : 'browse-arrow-next'} style={{
      position:'absolute', ...anchor(side),
      transform:'translateY(-50%)',
      zIndex:17, pointerEvents: disabled ? 'none' : 'auto',
    }}>
      <div style={{animation:'termFadeIn .18s ease-out'}}>
        <button
          onClick={() => !disabled && step(delta)}
          disabled={disabled}
          aria-label={delta < 0 ? 'previous record' : 'next record'}
          style={{
            background:'rgba(30,28,26,0.72)',
            backdropFilter:'blur(6px)',
            border:'1px solid rgba(232,228,220,0.22)',
            padding:'13px 15px',
            cursor:CURSOR_POINTER,
            opacity: disabled ? 0.25 : 1,
            color:'var(--cream-warm)',
            transition:'opacity .2s ease',
          }}>
          <span style={{fontSize:16, lineHeight:1, color:'var(--jade-light)'}}>{glyph}</span>
        </button>
      </div>
    </div>
  );
  return (
    <>
      {/* one-time hint, floated above the bin — NOT inside the info card */}
      <div data-hud="browse-hint" style={{
        position:'absolute', top:76, left:'50%', transform:'translateX(-50%)',
        zIndex:17, pointerEvents:'none',
      }}>
        <div style={{
          fontFamily:'var(--font-mono)', fontSize:9, fontWeight:600,
          letterSpacing:'.28em', textTransform:'uppercase',
          color:'var(--cream-deep)',
          background:'rgba(30,28,26,0.72)',
          border:'1px solid rgba(232,228,220,0.18)',
          backdropFilter:'blur(6px)',
          padding:'8px 14px',
          animation:'termFadeIn .18s ease-out',
        }}>
          {hint}
        </div>
      </div>
      {(!getRect || rect) && arrow('left',  '◄', -1, !!info.busy || info.index <= 0)}
      {(!getRect || rect) && arrow('right', '►', +1, !!info.busy || info.index >= info.count - 1)}
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// ScreenDialog — HTML overlay that sits exactly over the 3D
// monitor's screen and renders an interactive chat UI. Uses
// window.__getCockpitScreenRect() to align every frame.
// ─────────────────────────────────────────────────────────────
function ScreenDialog({ interactive, active }){
  const wrapRef = React.useRef(null);
  const [rect, setRect] = React.useState(null);
  const [messages, setMessages] = React.useState([
    { role:'system', text:'AX/OS v2.59 ready.' },
    { role:'system', text:'Type a prompt to begin.' }
  ]);
  const [input, setInput] = React.useState('');
  const [sending, setSending] = React.useState(false);
  const listRef = React.useRef(null);
  // Idle screen follows the cockpit theme: ivory reference panel in light,
  // quiet dark CRT in dark. The woken dialog stays cream (screen is "lit").
  const [theme, setTheme] = React.useState(() => (typeof window !== 'undefined' && window.__cockpitTheme) || 'dark');
  React.useEffect(() => {
    const onTheme = (e) => setTheme(e.detail && e.detail.theme === 'light' ? 'light' : 'dark');
    window.addEventListener('cockpit-theme', onTheme);
    return () => window.removeEventListener('cockpit-theme', onTheme);
  }, []);

  // Project screen rect every animation frame
  React.useEffect(() => {
    let raf;
    const tick = () => {
      const r = window.__getCockpitScreenRect && window.__getCockpitScreenRect();
      if (r && r.visible) setRect(r);
      else setRect(prev => prev ? { ...prev, hidden:true } : null);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  React.useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, sending]);

  const send = async () => {
    const q = input.trim();
    if (!q || sending) return;
    setMessages(m => [...m, { role:'user', text:q }]);
    setInput('');
    setSending(true);
    // Placeholder: will be replaced with real API call by user.
    try {
      let reply = '...';
      if (window.claude && window.claude.complete){
        reply = await window.claude.complete({
          messages:[{ role:'user', content:`You are a terse retro computer AI named AX/OS. Reply in ≤2 short sentences, lowercase, no emoji.\n\nuser: ${q}` }]
        });
      } else {
        reply = `> ack. '${q}' logged. (api offline)`;
      }
      setMessages(m => [...m, { role:'ax', text: (reply || '').trim() || '> silence.' }]);
    } catch (err){
      setMessages(m => [...m, { role:'ax', text:'> link error. retry.' }]);
    } finally {
      setSending(false);
    }
  };

  if (!rect) return null;
  const { corners, hidden } = rect;
  if (hidden || !corners) return null;
  const { TL, TR, BL, BR } = corners;
  // Bounding box in screen space (for pre-transform size)
  const minX = Math.min(TL.x, TR.x, BL.x, BR.x);
  const minY = Math.min(TL.y, TR.y, BL.y, BR.y);
  const maxX = Math.max(TL.x, TR.x, BL.x, BR.x);
  const maxY = Math.max(TL.y, TR.y, BL.y, BR.y);
  const bw = maxX - minX, bh = maxY - minY;
  if (bw < 20 || bh < 20) return null;
  // We render the dialog at size bw × bh positioned at (minX, minY), then
  // apply a matrix3d that maps its four corners to (TL, TR, BR, BL)
  // relative to its own top-left.
  const dstCorners = [
    [TL.x - minX, TL.y - minY],
    [TR.x - minX, TR.y - minY],
    [BR.x - minX, BR.y - minY],
    [BL.x - minX, BL.y - minY]
  ];
  const m3d = computeMatrix3d(bw, bh, dstCorners);
  if (!m3d) return null;
  const w = bw, h = bh;
  // Inner padding within the screen (use short edge of visible quad)
  const screenW = Math.hypot(TR.x - TL.x, TR.y - TL.y);
  const pad = Math.max(4, screenW * 0.035);
  const baseFont = Math.max(6, screenW * 0.022);
  return (
    <div
      ref={wrapRef}
      data-hud="screen-dialog"
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      style={{
        position:'absolute',
        left: minX, top: minY,
        width: w, height: h,
        transform: m3d,
        transformOrigin:'0 0',
        zIndex: 15,
        pointerEvents: (interactive && active) ? 'auto' : 'none',
        overflow:'hidden',
        // Superglass screen — warm cream panel like the "hello" Macintosh,
        // jade + ink type instead of the old dark-green CRT.
        background: active
          ? 'radial-gradient(ellipse at 50% 40%, #F4F0E6 0%, #DFD9CB 85%)'
          : theme === 'light'
            ? 'radial-gradient(ellipse at 50% 50%, #EDE8DC 0%, #D6D0C2 85%)'
            : 'radial-gradient(ellipse at 50% 50%, #1B1815 0%, #0E0C0A 85%)',
        boxShadow: active
          ? 'inset 0 0 26px rgba(30,28,26,0.18), inset 0 0 8px rgba(75,110,79,0.18), 0 0 22px rgba(232,228,220,0.2)'
          : theme === 'light'
            ? 'inset 0 0 22px rgba(30,28,26,0.22)'
            : 'inset 0 0 26px rgba(0,0,0,0.5), inset 0 0 10px rgba(122,154,126,0.08)',
        color:'#55514B',
        fontFamily:'"JetBrains Mono", monospace',
      }}>
      {/* scanlines — barely-there paper grain lines */}
      <div style={{
        position:'absolute', inset:0,
        backgroundImage: (active || theme === 'light')
          ? 'repeating-linear-gradient(0deg, rgba(30,28,26,0.05) 0px, rgba(30,28,26,0.05) 1px, transparent 1px, transparent 3px)'
          : 'repeating-linear-gradient(0deg, rgba(240,235,225,0.035) 0px, rgba(240,235,225,0.035) 1px, transparent 1px, transparent 3px)',
        pointerEvents:'none'
      }}/>
      {/* content */}
      {!active ? (
        <div style={{
          position:'absolute', inset:pad,
          display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'center',
          fontSize: baseFont, lineHeight: 1.4,
          color: theme === 'light' ? '#55514B' : 'rgba(232,228,220,0.55)',
          textAlign:'center'
        }}>
          {/* the "hello." homage — reference screen layout */}
          <div style={{fontFamily:'"Cormorant Garamond", Georgia, serif', fontStyle:'italic', fontWeight:500, fontSize: baseFont*3.4, color: theme === 'light' ? '#1E1C1A' : 'rgba(232,228,220,0.92)', lineHeight:1}}>hello.</div>
          <div style={{fontSize: baseFont*0.85, marginTop: pad*0.55, letterSpacing:'.38em', color: theme === 'light' ? '#6F8D75' : '#7A9A7E', fontWeight:700}}>A.X / STUDIO</div>
          <div style={{fontSize: baseFont*0.75, marginTop: pad*0.4, opacity:.55}}>—</div>
          <div style={{fontSize: baseFont*0.7, marginTop: pad*0.55, letterSpacing:'.3em', opacity:.7}}>AX/OS · CLICK TO WAKE</div>
          <div style={{fontSize: baseFont*0.75, marginTop: pad*0.35, opacity:.5, animation:'softBlink 1.4s infinite'}}>_</div>
        </div>
      ) : (
      <div style={{
        position:'absolute', inset:pad,
        display:'flex', flexDirection:'column',
        fontSize: baseFont,
        lineHeight: 1.35
      }}>
        {/* title bar */}
        <div style={{
          display:'flex', justifyContent:'space-between', alignItems:'center',
          borderBottom:'1px solid rgba(75,110,79,0.45)',
          paddingBottom: pad*0.3, marginBottom: pad*0.4,
          color:'#3A5A3E'
        }}>
          <span style={{letterSpacing:'.18em', fontWeight:700}}>AX/OS · DIALOG</span>
          <span style={{opacity:.6}}>● ● ●</span>
        </div>
        {/* message list */}
        <div ref={listRef} style={{
          flex:1, overflowY:'auto', paddingRight: pad*0.2,
          scrollbarWidth:'thin', scrollbarColor:'#4B6E4F transparent'
        }}>
          {messages.map((m, i) => (
            <div key={i} style={{
              marginBottom: pad*0.3,
              color: m.role === 'user' ? '#1E1C1A' : m.role === 'system' ? '#8E8A83' : '#3A5A3E',
              opacity: m.role === 'system' ? 0.9 : 1
            }}>
              <span style={{opacity:.6, marginRight: pad*0.2}}>
                {m.role === 'user' ? '›' : m.role === 'system' ? '*' : '·'}
              </span>
              {m.text}
            </div>
          ))}
          {sending && (
            <div style={{color:'#6E6878', opacity:.8}}>
              <span style={{opacity:.6, marginRight: pad*0.2}}>·</span>
              <span style={{animation:'softBlink 1s infinite'}}>thinking_</span>
            </div>
          )}
        </div>
        {/* input row */}
        <div style={{
          borderTop:'1px solid rgba(75,110,79,0.45)',
          paddingTop: pad*0.3, marginTop: pad*0.3,
          display:'flex', alignItems:'center', gap: pad*0.3
        }}>
          <span style={{color:'#3A5A3E', fontWeight:700}}>&gt;</span>
          <input
            aria-label="Ask AX/OS"
            name="axos-prompt"
            autoComplete="off"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') send(); }}
            placeholder="ask ax/os…"
            disabled={sending}
            style={{
              flex:1, background:'transparent', border:'none', outline:'none',
              color:'#1E1C1A', fontFamily:'inherit', fontSize:'inherit',
              caretColor:'#4B6E4F'
            }}
          />
          <button
            type="button"
            onClick={send}
            disabled={sending || !input.trim()}
            style={{
              background:'transparent', color:'#3A5A3E',
              border:'1px solid rgba(75,110,79,0.55)',
              padding:`${pad*0.15}px ${pad*0.4}px`,
              cursor: sending ? CURSOR_DEFAULT : CURSOR_POINTER,
              fontFamily:'inherit', fontSize:'inherit', letterSpacing:'.1em',
              textTransform:'uppercase', fontWeight:700,
              opacity: (sending || !input.trim()) ? .4 : 1
            }}
          >send</button>
        </div>
      </div>
      )}
    </div>
  );
}

export { Cockpit };

// ─────────────────────────────────────────────────────────────
// computeMatrix3d(w, h, [p0,p1,p2,p3])
//   Solves the 2D projective transform that maps the rect
//   (0,0)-(w,0)-(w,h)-(0,h) onto the given 4 destination points
//   (TL, TR, BR, BL in that order) and returns a CSS matrix3d().
//   Works for any convex quad including strong perspective.
// ─────────────────────────────────────────────────────────────
function computeMatrix3d(w, h, dst){
  // Solve for 8 unknowns (a..h) in the projective transform:
  //   x' = (a*x + b*y + c) / (g*x + h*y + 1)
  //   y' = (d*x + e*y + f) / (g*x + h*y + 1)
  // Source quad: (0,0), (w,0), (w,h), (0,h)
  const [p0, p1, p2, p3] = dst;
  const src = [[0,0],[w,0],[w,h],[0,h]];
  const A = [], b = [];
  for (let i=0; i<4; i++){
    const [sx, sy] = src[i];
    const [dx, dy] = dst[i];
    A.push([sx, sy, 1, 0, 0, 0, -sx*dx, -sy*dx]); b.push(dx);
    A.push([0, 0, 0, sx, sy, 1, -sx*dy, -sy*dy]); b.push(dy);
  }
  const x = solve8(A, b);
  if (!x) return null;
  const [a,bb,c,d,e,f,g,hh] = x;
  // CSS matrix3d is column-major. Projective 2D → 3D mapping with z=0:
  //   | a  b  0  c |
  //   | d  e  0  f |
  //   | 0  0  1  0 |
  //   | g  h  0  1 |
  return `matrix3d(${a},${d},0,${g}, ${bb},${e},0,${hh}, 0,0,1,0, ${c},${f},0,1)`;
}

// Gauss-Jordan solve for 8x8
function solve8(A, b){
  const n = 8;
  const M = A.map((row,i) => row.concat([b[i]]));
  for (let i=0; i<n; i++){
    // pivot
    let piv = i;
    for (let j=i+1; j<n; j++) if (Math.abs(M[j][i]) > Math.abs(M[piv][i])) piv = j;
    if (Math.abs(M[piv][i]) < 1e-10) return null;
    [M[i], M[piv]] = [M[piv], M[i]];
    const d = M[i][i];
    for (let k=i; k<=n; k++) M[i][k] /= d;
    for (let j=0; j<n; j++){
      if (j === i) continue;
      const f = M[j][i];
      if (f === 0) continue;
      for (let k=i; k<=n; k++) M[j][k] -= f * M[i][k];
    }
  }
  return M.map(row => row[n]);
}
