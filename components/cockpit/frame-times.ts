export type FrameTimesCaptureState = {
  readonly timeMs: number
  readonly pauseAmbient: true
} | null

export type FrameTimes = {
  readonly dtInteraction: number
  readonly tInteraction: number
  readonly dtAmbient: number
  readonly tAmbient: number
  readonly captureActive: boolean
}

const currentFrameTimes: {
  dtInteraction: number
  tInteraction: number
  dtAmbient: number
  tAmbient: number
  captureActive: boolean
} = {
  dtInteraction: 0,
  tInteraction: 0,
  dtAmbient: 0,
  tAmbient: 0,
  captureActive: false,
}

/**
 * Establish both time lanes from this dispatch's own arguments.
 * Capture mode keeps interaction mechanics live while ambient motion is
 * frozen at the configured scorecard time.
 */
export function setFrameTimes(
  dtInteraction: number,
  tInteraction: number,
  captureState: FrameTimesCaptureState,
): void {
  currentFrameTimes.dtInteraction = dtInteraction
  currentFrameTimes.tInteraction = tInteraction
  currentFrameTimes.dtAmbient = captureState === null ? dtInteraction : 0
  currentFrameTimes.tAmbient =
    captureState === null ? tInteraction : captureState.timeMs / 1_000
  currentFrameTimes.captureActive = captureState !== null
}

export function getFrameTimes(): FrameTimes {
  return currentFrameTimes
}
