// Wireframe cursors — outline-only SVG arrows in the site's editorial
// palette, replacing the browser default + the crosshair. Shared by the
// HUD stage (default) and the 3D pick handlers (pointer/hover state).
const wireArrow = (stroke: string, dot: string) =>
  `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='26' height='26'>` +
  `<path d='M5 3 L5 20 L9.8 15.6 L12.8 22.4 L15.6 21.2 L12.6 14.6 L19 14.6 Z' ` +
  `fill='rgba(30,28,26,0.4)' stroke='${stroke}' stroke-width='1.4' stroke-linejoin='miter'/>` +
  `<rect x='21' y='2' width='3' height='3' fill='${dot}'/>` +
  `</svg>") 5 3`

// Default: cream wireframe arrow with a jade tick.
export const CURSOR_DEFAULT = `${wireArrow('%23E8E4DC', '%234B6E4F')}, default`
// Pointer (interactive hover): jade wireframe arrow with a cream tick.
export const CURSOR_POINTER = `${wireArrow('%237A9A7E', '%23E8E4DC')}, pointer`
