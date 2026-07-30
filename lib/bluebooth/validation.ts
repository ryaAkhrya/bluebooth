import {
  CUSTOM_FRAME_ACCEPT,
  CUSTOM_FRAME_MAX_BYTES,
  CUSTOM_FRAME_MAX_DIMENSION,
} from '@/lib/bluebooth/constants'

export type FrameValidationResult =
  | { valid: true }
  | { valid: false; message: string }

export function validateCustomFrameFile(file: Pick<File, 'type' | 'size'>): FrameValidationResult {
  if (!CUSTOM_FRAME_ACCEPT.includes(file.type as (typeof CUSTOM_FRAME_ACCEPT)[number])) {
    return { valid: false, message: 'Choose a PNG or WebP frame.' }
  }
  if (file.size <= 0) return { valid: false, message: 'That image file is empty.' }
  if (file.size > CUSTOM_FRAME_MAX_BYTES) {
    return { valid: false, message: 'Custom frames must be 10 MB or smaller.' }
  }
  return { valid: true }
}

export function validateCustomFrameDimensions(
  width: number,
  height: number,
): FrameValidationResult {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return { valid: false, message: 'That image has invalid dimensions.' }
  }
  if (width > CUSTOM_FRAME_MAX_DIMENSION || height > CUSTOM_FRAME_MAX_DIMENSION) {
    return { valid: false, message: 'Custom frames must be at most 6000 px on each side.' }
  }
  return { valid: true }
}
