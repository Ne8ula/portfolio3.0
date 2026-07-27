// Wireframe cursors — outline-only SVG in the site's editorial palette,
// replacing the browser default + the crosshair. Shared by the HUD stage
// (default) and the 3D pick handlers (pointer/hover state). Both share the
// same construction: a translucent ink fill, a 1.4 stroke, and a small
// square tick in the top-right corner whose color inverts against the
// stroke — so ARROW→HAND and cream→jade read as one state change.
const SVG = (w: number, h: number, body: string) =>
  `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}'>${body}</svg>")`

const shape = (d: string, stroke: string, dot: string, join: string) =>
  `<path d='${d}' fill='rgba(30,28,26,0.4)' stroke='${stroke}' stroke-width='1.4' ` +
  `stroke-linejoin='${join}'${join === 'round' ? " stroke-linecap='round'" : ''}/>` +
  `<rect x='21' y='2' width='3' height='3' fill='${dot}'/>`

const ARROW = 'M5 3 L5 20 L9.8 15.6 L12.8 22.4 L15.6 21.2 L12.6 14.6 L19 14.6 Z'
// Pointing hand: index finger up, three knuckle steps down the fist, thumb
// tucked at the lower left. Hotspot sits at the fingertip.
const HAND =
  'M8.0 4.4 C8.0 2.8 10.9 2.8 10.9 4.4 L10.9 11.6 L11.8 11.2 ' +
  'C12.4 10.9 13.6 11.1 13.8 12.0 L13.9 12.7 L14.9 12.4 ' +
  'C15.6 12.2 16.6 12.5 16.7 13.4 L16.8 14.1 L17.7 13.9 ' +
  'C18.5 13.8 19.2 14.3 19.2 15.2 L19.2 17.6 ' +
  'C19.2 20.5 17.3 22.6 14.6 22.9 L11.9 22.9 ' +
  'C9.7 22.9 8.3 21.6 7.7 20.0 L6.2 16.2 ' +
  'C5.8 15.2 6.2 14.3 7.0 14.0 C7.6 13.8 8.0 14.1 8.0 14.1 Z'

// Default: cream wireframe arrow with a jade tick.
export const CURSOR_DEFAULT =
  `${SVG(26, 26, shape(ARROW, '%23E8E4DC', '%234B6E4F', 'miter'))} 5 3, default`
// Pointer (anything clickable — 3D heroes, records, HUD buttons, links):
// jade wireframe HAND with a cream tick, hotspot on the fingertip.
export const CURSOR_POINTER =
  `${SVG(26, 26, shape(HAND, '%237A9A7E', '%23E8E4DC', 'round'))} 9 3, pointer`
