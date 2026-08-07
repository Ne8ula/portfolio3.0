// @ts-nocheck
"use client"

import React from "react"

import { getHudFrameMeta } from "./hud-sampler"

export function shouldMountHudDebug(search, environment){
  if (environment === 'production') return false;
  return new URLSearchParams(search).get('hudDebug') === '1';
}

function subjectFor(frame){
  if (!frame) return null;
  if (frame.mode === 'monitor') return frame.monitor;
  if (frame.mode === 'deck') return frame.deck.card;
  if (frame.mode === 'cockpit') return frame.pc || frame.crate.rect;
  return null;
}

export function HudDebugOverlay({ frame }){
  const [occupied, setOccupied] = React.useState([]);

  React.useLayoutEffect(() => {
    if (!frame) {
      setOccupied([]);
      return;
    }
    const stage = document.querySelector('[data-layout-region="cockpit-stage"]');
    if (!stage) return;
    const stageRect = stage.getBoundingClientRect();
    const originX = stageRect.left + stage.clientLeft;
    const originY = stageRect.top + stage.clientTop;
    setOccupied(
      Array.from(document.querySelectorAll('[data-hud]')).flatMap((element) => {
        const name = element.getAttribute('data-hud');
        if (!name) return [];
        const rect = element.getBoundingClientRect();
        return [{
          name,
          x: rect.left - originX,
          y: rect.top - originY,
          w: rect.width,
          h: rect.height,
        }];
      }),
    );
  }, [frame]);

  if (!frame) return null;
  const meta = getHudFrameMeta();
  const subject = subjectFor(frame);
  const quad = subject?.corners ? subject : null;
  const rect = quad ? null : subject;
  const readout = [
    `frame ${frame.frameId}`,
    frame.mode,
    `${frame.stage.w.toFixed(1)}×${frame.stage.h.toFixed(1)}`,
    `size ${meta.sizeVersion}`,
    `pub ${meta.publishCount}`,
    `grace ${meta.graceRemainingMs === null ? '—' : `${Math.ceil(meta.graceRemainingMs)}ms`}`,
  ].join(' · ');

  return (
    <div
      aria-hidden="true"
      data-hud-debug-overlay
      style={{
        position:'absolute',
        inset:0,
        zIndex:120,
        pointerEvents:'none',
        overflow:'hidden',
        color:'var(--cream-deep)',
        fontFamily:'var(--font-mono)',
      }}
    >
      <div style={{
        position:'absolute',
        left:frame.safeFrame.x,
        top:frame.safeFrame.y,
        width:frame.safeFrame.w,
        height:frame.safeFrame.h,
        boxSizing:'border-box',
        border:'1px dashed var(--cream-deep)',
        background:'color-mix(in srgb, var(--cream-deep) 3%, transparent)',
      }}/>

      {rect ? (
        <div style={{
          position:'absolute',
          left:rect.x,
          top:rect.y,
          width:rect.w,
          height:rect.h,
          boxSizing:'border-box',
          border:`1px ${rect.retained ? 'dashed' : 'solid'} var(--jade)`,
          background:'color-mix(in srgb, var(--jade) 3%, transparent)',
        }}/>
      ) : null}

      {quad ? (
        <svg style={{position:'absolute',inset:0,width:'100%',height:'100%',overflow:'visible'}}>
          <polygon
            points={[
              quad.corners.tl,
              quad.corners.tr,
              quad.corners.br,
              quad.corners.bl,
            ].map((point) => `${point.x},${point.y}`).join(' ')}
            fill="color-mix(in srgb, var(--jade) 3%, transparent)"
            stroke="var(--jade)"
            strokeWidth="1"
          />
        </svg>
      ) : null}

      {occupied.map((item, index) => (
        <div
          key={`${item.name}-${index}`}
          style={{
            position:'absolute',
            left:item.x,
            top:item.y,
            width:item.w,
            height:item.h,
            boxSizing:'border-box',
            border:'1px solid var(--mauve)',
            background:'color-mix(in srgb, var(--mauve) 3%, transparent)',
          }}
        >
          <span style={{
            position:'absolute',
            left:1,
            top:1,
            padding:'1px 2px',
            color:'var(--cream-deep)',
            background:'color-mix(in srgb, var(--ink) 4%, transparent)',
            fontSize:9,
            lineHeight:1.2,
            whiteSpace:'nowrap',
          }}>{item.name}</span>
        </div>
      ))}

      <div style={{
        position:'absolute',
        left:4,
        bottom:4,
        maxWidth:'calc(100% - 8px)',
        padding:'3px 5px',
        border:'1px solid var(--mauve)',
        background:'color-mix(in srgb, var(--ink) 4%, transparent)',
        color:'var(--cream-deep)',
        fontSize:9,
        lineHeight:1.35,
        whiteSpace:'nowrap',
      }}>{readout}</div>
    </div>
  );
}
