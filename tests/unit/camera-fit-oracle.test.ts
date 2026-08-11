import { describe, expect, it } from 'vitest'
import * as THREE from 'three'

import {
  projectFitPoint,
  solveCameraFit,
  type FitCameraInput,
  type FitVec3,
} from '@/lib/responsive/camera-fit'

const baseInput = (
  overrides: Partial<FitCameraInput> = {},
): FitCameraInput => ({
  center: { x: 0, y: 0, z: 0 },
  direction: { x: 0, y: 0, z: 1 },
  points: [{ x: 0, y: 0, z: 0 }],
  fovYRad: (68 * Math.PI) / 180,
  aspect: 16 / 9,
  near: 0.1,
  ndcBounds: { minX: -1, maxX: 1, minY: -1, maxY: 1 },
  distance: { min: 0.2, max: 60 },
  ...overrides,
})

function normalize(vector: FitVec3): THREE.Vector3 {
  return new THREE.Vector3(vector.x, vector.y, vector.z).normalize()
}

describe('camera-fit mathematical oracles', () => {
  it('matches the symmetric planar max(distV, distH) solution within 0.5%', () => {
    const halfWidth = 2.4
    const halfHeight = 1.35
    const fovYRad = (68 * Math.PI) / 180
    const aspect = 16 / 9
    const fill = 0.8
    const analytic = Math.max(
      halfHeight / (Math.tan(fovYRad / 2) * fill),
      halfWidth / (Math.tan(fovYRad / 2) * aspect * fill),
    )
    const result = solveCameraFit(
      baseInput({
        points: [
          { x: -halfWidth, y: -halfHeight, z: 0 },
          { x: halfWidth, y: -halfHeight, z: 0 },
          { x: -halfWidth, y: halfHeight, z: 0 },
          { x: halfWidth, y: halfHeight, z: 0 },
        ],
        fovYRad,
        aspect,
        ndcBounds: { minX: -fill, maxX: fill, minY: -fill, maxY: fill },
        tolerance: 1e-7,
        maxIterations: 32,
      }),
    )

    expect(result.status).toBe('fit')
    if (result.status !== 'fit') return
    expect(Math.abs(result.distance - analytic) / analytic).toBeLessThanOrEqual(0.005)
  })

  it('matches THREE.PerspectiveCamera projection across ordinary and steep poses', () => {
    const cases = [
      {
        center: { x: 0, y: 0, z: 0 },
        direction: { x: 0, y: 0, z: 1 },
        up: { x: 0, y: 1, z: 0 },
        distance: 4,
      },
      {
        center: { x: 2, y: -1, z: 3 },
        direction: normalize({ x: 0.7, y: 0.4, z: -0.5 }),
        up: normalize({ x: 0.1, y: 1, z: 0.2 }),
        distance: 7.5,
      },
      {
        center: { x: -2, y: 0.5, z: 1 },
        direction: { x: 0, y: 1, z: 0 },
        up: { x: 0, y: 1, z: 0 },
        distance: 5,
      },
    ] as const
    const localOffsets = [
      { x: -0.7, y: -0.4, z: 0 },
      { x: 0.8, y: -0.25, z: -0.2 },
      { x: -0.3, y: 0.6, z: 0.15 },
      { x: 0.5, y: 0.45, z: -0.1 },
    ] as const

    for (const [caseIndex, sample] of cases.entries()) {
      const direction = normalize(sample.direction)
      const center = new THREE.Vector3(
        sample.center.x,
        sample.center.y,
        sample.center.z,
      )
      const camera = new THREE.PerspectiveCamera(68, 16 / 9, 0.1, 1000)
      camera.up.copy(normalize(sample.up))
      camera.position.copy(center).addScaledVector(direction, sample.distance)
      camera.lookAt(center)
      camera.updateMatrixWorld(true)

      const input = baseInput({
        center: sample.center,
        direction,
        up: sample.up,
      })

      for (const [pointIndex, offset] of localOffsets.entries()) {
        const point = {
          x: sample.center.x + offset.x,
          y: sample.center.y + offset.y,
          z: sample.center.z + offset.z,
        }
        const pure = projectFitPoint(input, point, sample.distance)
        const world = new THREE.Vector3(point.x, point.y, point.z)
        const projected = world.clone().project(camera)
        const view = world.clone().applyMatrix4(camera.matrixWorldInverse)

        const label = `case ${caseIndex}, point ${pointIndex}`
        expect(pure, label).not.toBeNull()
        expect(pure?.ndcX, `${label} ndcX`).toBeCloseTo(projected.x, 6)
        expect(pure?.ndcY, `${label} ndcY`).toBeCloseTo(projected.y, 6)
        expect(pure?.viewZ, `${label} viewZ`).toBeCloseTo(view.z, 6)
      }
    }
  })
})
