import { getCameraFilter } from '@/lib/bluebooth/presets/filters'
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

export function captureVideoFrame(
  video: HTMLVideoElement | null,
  settings: CameraSettings,
): string {
  const canvas = document.createElement('canvas')
  canvas.width = 800
  canvas.height = 600
  const context = canvas.getContext('2d')
  if (!context) return ''

  if (video?.videoWidth && video.videoHeight) {
    context.save()
    context.filter = cameraFilterCss(settings)
    if (settings.mirror) {
      context.translate(canvas.width, 0)
      context.scale(-1, 1)
    }
    const videoRatio = video.videoWidth / video.videoHeight
    const canvasRatio = canvas.width / canvas.height
    let sourceX = 0
    let sourceY = 0
    let sourceWidth = video.videoWidth
    let sourceHeight = video.videoHeight
    if (settings.fit === 'cover') {
      if (videoRatio > canvasRatio) {
        sourceWidth = video.videoHeight * canvasRatio
        sourceX = (video.videoWidth - sourceWidth) / 2
      } else {
        sourceHeight = video.videoWidth / canvasRatio
        sourceY = (video.videoHeight - sourceHeight) / 2
      }
    }
    context.drawImage(
      video,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      canvas.width,
      canvas.height,
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
  return canvas.toDataURL('image/jpeg', 0.9)
}
