// Pure projection-based focus-camera fitting. This strict-island module
// deliberately has no three.js, DOM, or renderer dependency: speculative
// candidate tests cannot mutate the live camera by construction.

import type { Rect, Size } from '@/lib/responsive/geometry'
import { isFiniteRect } from '@/lib/responsive/geometry'

export type FitVec2 = {
  readonly x: number
  readonly y: number
}

export type FitVec3 = {
  readonly x: number
  readonly y: number
  readonly z: number
}

export type FitNdcBounds = {
  readonly minX: number
  readonly maxX: number
  readonly minY: number
  readonly maxY: number
}

export type FitDistanceBounds = {
  readonly min: number
  readonly max: number
}

export type FitCameraInput = {
  readonly center: FitVec3
  readonly direction: FitVec3
  readonly up?: FitVec3
  readonly points: readonly FitVec3[]
  readonly fovYRad: number
  readonly aspect: number
  readonly near: number
  readonly ndcBounds: FitNdcBounds
  readonly distance: FitDistanceBounds
  readonly maxIterations?: number
  readonly tolerance?: number
}

export type FitCameraResult =
  | {
      readonly status: 'fit'
      readonly distance: number
      readonly iterations: number
    }
  | {
      readonly status: 'no-fit'
      readonly reason: 'invalid-input' | 'unfittable-at-max'
    }

export type FitProjection = {
  readonly ndcX: number
  readonly ndcY: number
  readonly viewZ: number
}

type FitBasis = {
  readonly rayX: number
  readonly rayY: number
  readonly rayZ: number
  readonly directionX: number
  readonly directionY: number
  readonly directionZ: number
  readonly rightX: number
  readonly rightY: number
  readonly rightZ: number
  readonly cameraUpX: number
  readonly cameraUpY: number
  readonly cameraUpZ: number
}

const DEFAULT_MAX_ITERATIONS = 16
const DEFAULT_UP = { x: 0, y: 1, z: 0 } as const
const VERTICAL_DOT_THRESHOLD = 0.999
const LOOK_AT_EPSILON = 0.0001
const BASIS_EPSILON_SQ = 1e-24

function finiteVec2(value: FitVec2): boolean {
  return Number.isFinite(value.x) && Number.isFinite(value.y)
}

function finiteVec3(value: FitVec3): boolean {
  return (
    Number.isFinite(value.x) &&
    Number.isFinite(value.y) &&
    Number.isFinite(value.z)
  )
}

function finiteNdcBounds(bounds: FitNdcBounds): boolean {
  return (
    Number.isFinite(bounds.minX) &&
    Number.isFinite(bounds.maxX) &&
    Number.isFinite(bounds.minY) &&
    Number.isFinite(bounds.maxY)
  )
}

function vectorLength(x: number, y: number, z: number): number {
  return Math.sqrt(x * x + y * y + z * z)
}

/**
 * Convert a stage-coordinate safe frame to the asymmetric NDC rectangle
 * consumed by the solver. This is the exact inverse of stage projection.
 */
export function safeFrameToNdcBounds(
  safeFrame: Rect,
  canvasOffset: FitVec2,
  canvasSize: Size,
): FitNdcBounds | null {
  if (
    !isFiniteRect(safeFrame) ||
    safeFrame.w <= 0 ||
    safeFrame.h <= 0 ||
    !finiteVec2(canvasOffset) ||
    !Number.isFinite(canvasSize.w) ||
    !Number.isFinite(canvasSize.h) ||
    canvasSize.w <= 0 ||
    canvasSize.h <= 0
  ) {
    return null
  }

  const minX = ((safeFrame.x - canvasOffset.x) / canvasSize.w) * 2 - 1
  const maxX =
    ((safeFrame.x + safeFrame.w - canvasOffset.x) / canvasSize.w) * 2 - 1
  const maxY = 1 - ((safeFrame.y - canvasOffset.y) / canvasSize.h) * 2
  const minY =
    1 - ((safeFrame.y + safeFrame.h - canvasOffset.y) / canvasSize.h) * 2
  const bounds = { minX, maxX, minY, maxY }

  return finiteNdcBounds(bounds) ? bounds : null
}

function createFitBasis(direction: FitVec3, up: FitVec3): FitBasis | null {
  if (!finiteVec3(direction) || !finiteVec3(up)) return null

  const directionLength = vectorLength(direction.x, direction.y, direction.z)
  const upLength = vectorLength(up.x, up.y, up.z)
  if (!(directionLength > 0) || !(upLength > 0)) return null

  let directionX = direction.x / directionLength
  let directionY = direction.y / directionLength
  let directionZ = direction.z / directionLength
  const rayX = directionX
  const rayY = directionY
  const rayZ = directionZ
  const upX = up.x / upLength
  const upY = up.y / upLength
  const upZ = up.z / upLength

  let rightX = upY * directionZ - upZ * directionY
  let rightY = upZ * directionX - upX * directionZ
  let rightZ = upX * directionY - upY * directionX
  let rightLengthSq = rightX * rightX + rightY * rightY + rightZ * rightZ
  const upDotDirection =
    upX * directionX + upY * directionY + upZ * directionZ

  // THREE.Matrix4.lookAt resolves a parallel up/forward pair by nudging the
  // view direction toward world +Z for the default +Y up (or +X when up is
  // itself ±Z). Keep that exact sign convention for the optical-axis edge
  // case while avoiding needless perturbation of merely steep valid bases.
  if (
    Math.abs(upDotDirection) > VERTICAL_DOT_THRESHOLD &&
    rightLengthSq <= BASIS_EPSILON_SQ
  ) {
    if (Math.abs(upZ) === 1) directionX += LOOK_AT_EPSILON
    else directionZ += LOOK_AT_EPSILON

    const adjustedLength = vectorLength(directionX, directionY, directionZ)
    directionX /= adjustedLength
    directionY /= adjustedLength
    directionZ /= adjustedLength
    rightX = upY * directionZ - upZ * directionY
    rightY = upZ * directionX - upX * directionZ
    rightZ = upX * directionY - upY * directionX
    rightLengthSq = rightX * rightX + rightY * rightY + rightZ * rightZ
  }

  if (!(rightLengthSq > BASIS_EPSILON_SQ)) return null

  const rightLength = Math.sqrt(rightLengthSq)
  rightX /= rightLength
  rightY /= rightLength
  rightZ /= rightLength

  // Camera-local +Y = direction × right, matching Matrix4.lookAt.
  const cameraUpX = directionY * rightZ - directionZ * rightY
  const cameraUpY = directionZ * rightX - directionX * rightZ
  const cameraUpZ = directionX * rightY - directionY * rightX

  return {
    rayX,
    rayY,
    rayZ,
    directionX,
    directionY,
    directionZ,
    rightX,
    rightY,
    rightZ,
    cameraUpX,
    cameraUpY,
    cameraUpZ,
  }
}

function hasValidProjectionPolicy(input: FitCameraInput): boolean {
  return (
    finiteVec3(input.center) &&
    Number.isFinite(input.fovYRad) &&
    input.fovYRad > 0 &&
    input.fovYRad < Math.PI &&
    Number.isFinite(input.aspect) &&
    input.aspect > 0 &&
    Number.isFinite(input.near) &&
    input.near > 0
  )
}

function projectWithBasis(
  input: FitCameraInput,
  basis: FitBasis,
  point: FitVec3,
  distance: number,
): FitProjection | null {
  if (!finiteVec3(point) || !Number.isFinite(distance) || distance < 0) {
    return null
  }

  const cameraX = input.center.x + basis.rayX * distance
  const cameraY = input.center.y + basis.rayY * distance
  const cameraZ = input.center.z + basis.rayZ * distance
  const offsetX = point.x - cameraX
  const offsetY = point.y - cameraY
  const offsetZ = point.z - cameraZ
  const viewX =
    offsetX * basis.rightX +
    offsetY * basis.rightY +
    offsetZ * basis.rightZ
  const viewY =
    offsetX * basis.cameraUpX +
    offsetY * basis.cameraUpY +
    offsetZ * basis.cameraUpZ
  const viewZ =
    offsetX * basis.directionX +
    offsetY * basis.directionY +
    offsetZ * basis.directionZ

  if (
    !Number.isFinite(viewX) ||
    !Number.isFinite(viewY) ||
    !Number.isFinite(viewZ) ||
    viewZ >= -input.near
  ) {
    return null
  }

  const tanHalfFovY = Math.tan(input.fovYRad / 2)
  const depth = -viewZ
  const ndcX = viewX / (depth * tanHalfFovY * input.aspect)
  const ndcY = viewY / (depth * tanHalfFovY)

  return Number.isFinite(ndcX) && Number.isFinite(ndcY)
    ? { ndcX, ndcY, viewZ }
    : null
}

/** Project one world point with the solver's pure camera arithmetic. */
export function projectFitPoint(
  input: FitCameraInput,
  point: FitVec3,
  distance: number,
): FitProjection | null {
  if (!hasValidProjectionPolicy(input)) return null
  const basis = createFitBasis(input.direction, input.up ?? DEFAULT_UP)
  return basis === null ? null : projectWithBasis(input, basis, point, distance)
}

function candidateFits(
  input: FitCameraInput,
  basis: FitBasis,
  distance: number,
): boolean {
  const bounds = input.ndcBounds
  const cameraX = input.center.x + basis.rayX * distance
  const cameraY = input.center.y + basis.rayY * distance
  const cameraZ = input.center.z + basis.rayZ * distance
  const tanHalfFovY = Math.tan(input.fovYRad / 2)

  // Candidate evaluation allocates nothing: fitting is a bounded scalar scan
  // over the caller-owned authored point array.
  for (const point of input.points) {
    const offsetX = point.x - cameraX
    const offsetY = point.y - cameraY
    const offsetZ = point.z - cameraZ
    const viewX =
      offsetX * basis.rightX +
      offsetY * basis.rightY +
      offsetZ * basis.rightZ
    const viewY =
      offsetX * basis.cameraUpX +
      offsetY * basis.cameraUpY +
      offsetZ * basis.cameraUpZ
    const viewZ =
      offsetX * basis.directionX +
      offsetY * basis.directionY +
      offsetZ * basis.directionZ
    const depth = -viewZ
    const ndcX = viewX / (depth * tanHalfFovY * input.aspect)
    const ndcY = viewY / (depth * tanHalfFovY)

    if (
      !Number.isFinite(viewX) ||
      !Number.isFinite(viewY) ||
      !Number.isFinite(viewZ) ||
      viewZ >= -input.near ||
      !Number.isFinite(ndcX) ||
      !Number.isFinite(ndcY) ||
      ndcX < bounds.minX ||
      ndcX > bounds.maxX ||
      ndcY < bounds.minY ||
      ndcY > bounds.maxY
    ) {
      return false
    }
  }

  return true
}

function validInput(input: FitCameraInput): FitBasis | null {
  if (
    !hasValidProjectionPolicy(input) ||
    input.points.length === 0 ||
    !input.points.every(finiteVec3) ||
    !finiteNdcBounds(input.ndcBounds) ||
    input.ndcBounds.minX >= input.ndcBounds.maxX ||
    input.ndcBounds.minY >= input.ndcBounds.maxY ||
    input.ndcBounds.minX > 0 ||
    input.ndcBounds.maxX < 0 ||
    input.ndcBounds.minY > 0 ||
    input.ndcBounds.maxY < 0 ||
    !Number.isFinite(input.distance.min) ||
    !Number.isFinite(input.distance.max) ||
    input.distance.min < 0 ||
    input.distance.min >= input.distance.max
  ) {
    return null
  }

  const maxIterations = input.maxIterations ?? DEFAULT_MAX_ITERATIONS
  const tolerance =
    input.tolerance ?? Math.max(1e-3, 5e-4 * input.distance.max)
  if (
    !Number.isInteger(maxIterations) ||
    maxIterations <= 0 ||
    !Number.isFinite(tolerance) ||
    tolerance <= 0
  ) {
    return null
  }

  return createFitBasis(input.direction, input.up ?? DEFAULT_UP)
}

/**
 * Find the smallest allowed distance whose projected authored points all fit
 * the asymmetric bounds. Binary search is sound only because validation
 * requires the bounds to contain the optical center on both axes.
 */
export function solveCameraFit(input: FitCameraInput): FitCameraResult {
  const basis = validInput(input)
  if (basis === null) return { status: 'no-fit', reason: 'invalid-input' }

  if (!candidateFits(input, basis, input.distance.max)) {
    return { status: 'no-fit', reason: 'unfittable-at-max' }
  }
  if (candidateFits(input, basis, input.distance.min)) {
    return { status: 'fit', distance: input.distance.min, iterations: 0 }
  }

  const maxIterations = input.maxIterations ?? DEFAULT_MAX_ITERATIONS
  const tolerance =
    input.tolerance ?? Math.max(1e-3, 5e-4 * input.distance.max)
  let lower = input.distance.min
  let upper = input.distance.max
  let iterations = 0

  while (iterations < maxIterations && upper - lower > tolerance) {
    const candidate = lower + (upper - lower) / 2
    if (candidateFits(input, basis, candidate)) upper = candidate
    else lower = candidate
    iterations += 1
  }

  return { status: 'fit', distance: upper, iterations }
}
