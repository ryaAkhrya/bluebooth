import { describe, expect, it } from 'vitest'
import {
  validateCustomFrameDimensions,
  validateCustomFrameFile,
} from '@/lib/bluebooth/validation'

describe('custom frame validation', () => {
  it('accepts bounded PNG and WebP files', () => {
    expect(validateCustomFrameFile({ type: 'image/png', size: 1024 }).valid).toBe(true)
    expect(validateCustomFrameFile({ type: 'image/webp', size: 1024 }).valid).toBe(true)
  })

  it('rejects unsupported, empty, and oversized files', () => {
    expect(validateCustomFrameFile({ type: 'image/jpeg', size: 1024 }).valid).toBe(false)
    expect(validateCustomFrameFile({ type: 'image/png', size: 0 }).valid).toBe(false)
    expect(validateCustomFrameFile({ type: 'image/png', size: 11 * 1024 * 1024 }).valid).toBe(false)
  })

  it('rejects invalid decoded dimensions', () => {
    expect(validateCustomFrameDimensions(6000, 6000).valid).toBe(true)
    expect(validateCustomFrameDimensions(6001, 100).valid).toBe(false)
    expect(validateCustomFrameDimensions(0, 100).valid).toBe(false)
  })
})
