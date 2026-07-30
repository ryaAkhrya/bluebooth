import { getCameraFilter } from '@/lib/bluebooth/presets/filters'
import { TEMP_CAPTURE_MAX_DIMENSION } from '@/lib/bluebooth/constants'
import { getCaptureDimensions, getImageDrawPlan } from '@/lib/bluebooth/image'
import type { CameraSettings } from '@/types/bluebooth'

export function cameraFilterCss(settings: CameraSettings): string {
  const preset = getCameraFilter(settings.filter).css
  const warmth =
    settings.warmth > 0
      ? `sepia(${(settings.warmth / 100).toFixed(2)})`
      : settings.warmth < 0
        ? `hue-rotate(${settings.warmth / 5}deg)`
        : ''
  return [
    preset,
    `brightness(${settings.brightness})`,
    `contrast(${settings.contrast})`,
    `saturate(${settings.saturation})`,
    warmth,
  ]
    .filter(Boolean)
    .join(' ')
}

export function cameraTransform(settings: CameraSettings): string {
  return `${settings.mirror ? 'scaleX(-1)' : ''} scale(${settings.zoom})`.trim()
}

export interface CapturedFrame {
  blob: Blob
  width: number
  height: number
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: 'image/webp' | 'image/jpeg',
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error('The browser could not encode the capture')),
      type,
      quality,
    )
  })
}

export async function captureVideoFrame(
  video: HTMLVideoElement | null,
  settings: CameraSettings,
): Promise<CapturedFrame> {
  const canvas = document.createElement('canvas')
  const sourceWidth = video?.videoWidth || 800
  const sourceHeight = video?.videoHeight || 600
  const [width, height] = getCaptureDimensions(
    sourceWidth,
    sourceHeight,
    TEMP_CAPTURE_MAX_DIMENSION,
  )
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas is unavailable')

  if (video?.videoWidth && video.videoHeight) {
    context.fillStyle = '#dceeff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    const plan = getImageDrawPlan(
      video.videoWidth,
      video.videoHeight,
      canvas.width,
      canvas.height,
      settings.fit,
      settings.zoom,
    )
    context.save()
    context.filter = cameraFilterCss(settings)
    if (settings.mirror) {
      context.translate(canvas.width, 0)
      context.scale(-1, 1)
    }
    context.drawImage(
      video,
      plan.sourceX,
      plan.sourceY,
      plan.sourceWidth,
      plan.sourceHeight,
      plan.destinationX,
      plan.destinationY,
      plan.destinationWidth,
      plan.destinationHeight,
    )
    context.restore()
  } else {
    const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height)
    gradient.addColorStop(0, '#dceeff')
    gradient.addColorStop(1, '#8fc5ff')
    context.fillStyle = gradient
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.fillStyle = '#1f5fad'
    context.font = '600 26px system-ui'
    context.textAlign = 'center'
    context.fillText('Bluebooth', canvas.width / 2, canvas.height / 2)
  }
  let blob: Blob
  try {
    blob = await canvasToBlob(canvas, 'image/webp', 0.9)
  } catch {
    blob = await canvasToBlob(canvas, 'image/jpeg', 0.9)
  }
  return { blob, width: canvas.width, height: canvas.height }
}
