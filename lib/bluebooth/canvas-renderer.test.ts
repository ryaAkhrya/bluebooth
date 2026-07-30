import { describe, expect, it } from 'vitest'
import {
  configureCompositionImageCors,
  getRenderLayerOrder,
} from '@/lib/bluebooth/canvas-renderer'
import type { CustomFrame } from '@/types/bluebooth'

const frame: CustomFrame = {
  id: 'frame',
  name: 'Frame',
  width: 100,
  height: 100,
  opacity: 100,
  scale: 100,
  x: 0,
  y: 0,
  fit: 'contain',
  front: true,
}

describe('canvas layer configuration', () => {
  it('loads signed composition images with anonymous CORS before drawing', () => {
    const image = { crossOrigin: null as string | null }
    configureCompositionImageCors(image)
    expect(image.crossOrigin).toBe('anonymous')
  })

  it('places a front overlay after photos and built-in frame details', () => {
    expect(getRenderLayerOrder(frame)).toEqual([
      'background',
      'photos',
      'frame',
      'frontFrame',
      'text',
    ])
  })

  it('places a behind overlay before photos', () => {
    expect(getRenderLayerOrder({ ...frame, front: false })).toEqual([
      'background',
      'behindFrame',
      'photos',
      'frame',
      'text',
    ])
  })
})
