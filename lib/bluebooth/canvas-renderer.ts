import { getSlotRects } from '@/lib/bluebooth/geometry'
import { getFramePreset } from '@/lib/bluebooth/presets/frames'
import { getGridPreset } from '@/lib/bluebooth/presets/grids'
import type { BlueboothState, CustomFrame } from '@/types/bluebooth'

function loadImage(source: string): Promise<HTMLImageElement | null> {
  if (!source) return Promise.resolve(null)
  return new Promise((resolve) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => resolve(null)
    image.src = source
  })
}

function roundedPath(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const safeRadius = Math.min(radius, width / 2, height / 2)
  context.beginPath()
  context.roundRect(x, y, width, height, safeRadius)
  context.clip()
}

function drawCover(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const imageRatio = image.width / image.height
  const rectRatio = width / height
  let sourceX = 0
  let sourceY = 0
  let sourceWidth = image.width
  let sourceHeight = image.height
  if (imageRatio > rectRatio) {
    sourceWidth = image.height * rectRatio
    sourceX = (image.width - sourceWidth) / 2
  } else {
    sourceHeight = image.width / rectRatio
    sourceY = (image.height - sourceHeight) / 2
  }
  context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, x, y, width, height)
}

async function drawCustomFrame(
  context: CanvasRenderingContext2D,
  frame: CustomFrame,
  width: number,
  height: number,
) {
  const image = await loadImage(frame.url)
  if (!image) return
  const scale = frame.scale / 100
  let drawWidth = width * scale
  let drawHeight = height * scale
  if (frame.fit !== 'fill') {
    const factor =
      frame.fit === 'contain'
        ? Math.min(width / image.width, height / image.height)
        : Math.max(width / image.width, height / image.height)
    drawWidth = image.width * factor * scale
    drawHeight = image.height * factor * scale
  }
  const x = (width - drawWidth) / 2 + (frame.x / 100) * width
  const y = (height - drawHeight) / 2 + (frame.y / 100) * height
  context.save()
  context.globalAlpha = frame.opacity / 100
  context.drawImage(image, x, y, drawWidth, drawHeight)
  context.restore()
}

export async function renderFinalCanvas(
  canvas: HTMLCanvasElement,
  state: BlueboothState,
): Promise<string> {
  const preset = getGridPreset(state.selectedGrid)
  const frame = getFramePreset(state.selectedFrame)
  const [width, height] = preset.output
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas is unavailable')
  const scale = Math.min(width, height) / 400
  const framePadding = frame.padding * scale
  const padding = state.layout.padding * scale + framePadding
  const gap = state.layout.gap * scale
  const radius = (state.layout.radius + (frame.roundExtra ? 8 : 0)) * scale
  const bottomLabel =
    frame.captionArea || frame.dateArea || state.frameOptions.showDate || state.frameOptions.showRoom
      ? 40 * scale
      : 0
  const topLabel = frame.topLabel ? 34 * scale : 0

  context.fillStyle = frame.background || state.layout.background
  context.fillRect(0, 0, width, height)
  if (frame.check) {
    context.fillStyle = 'rgba(255,255,255,.22)'
    const size = 28 * scale
    for (let y = 0; y < height; y += size) {
      for (let x = 0; x < width; x += size) {
        if ((x / size + y / size) % 2 === 0) context.fillRect(x, y, size, size)
      }
    }
  }
  if (state.customFrame && !state.customFrame.front) {
    await drawCustomFrame(context, state.customFrame, width, height)
  }

  const rects = getSlotRects(preset, width, height, gap, padding, topLabel, bottomLabel)
  const images = await Promise.all(rects.map((_, index) => loadImage(state.capturedPhotos[index] ?? '')))
  rects.forEach((rect, index) => {
    context.save()
    roundedPath(context, rect.x, rect.y, rect.width, rect.height, radius)
    const image = images[index]
    if (image) {
      drawCover(context, image, rect.x, rect.y, rect.width, rect.height)
    } else {
      context.fillStyle = '#dceeff'
      context.fillRect(rect.x, rect.y, rect.width, rect.height)
    }
    context.restore()
    if (state.frameOptions.borderWidth > 0) {
      context.strokeStyle = state.frameOptions.borderColor
      context.lineWidth = state.frameOptions.borderWidth * scale
      context.strokeRect(rect.x, rect.y, rect.width, rect.height)
    }
    if (frame.numbering) {
      context.fillStyle = '#17243a'
      context.font = `${12 * scale}px system-ui`
      context.fillText(String(index + 1).padStart(2, '0'), rect.x + 6 * scale, rect.y + 16 * scale)
    }
  })

  const caption =
    state.frameOptions.caption ||
    (state.frameOptions.showRoom ? `Room ${state.roomCode}` : '')
  const date = state.frameOptions.showDate || frame.dateArea ? new Date().toLocaleDateString() : ''
  context.fillStyle = frame.film ? '#ffffff' : '#17243a'
  context.textAlign = 'center'
  context.font = `600 ${13 * scale}px system-ui`
  if (frame.topLabel) context.fillText(caption || state.roomName, width / 2, padding * 0.72)
  if (bottomLabel) {
    context.fillText([caption, date].filter(Boolean).join(' · '), width / 2, height - padding * 0.45)
  }
  if (state.customFrame?.front) await drawCustomFrame(context, state.customFrame, width, height)
  return canvas.toDataURL('image/png')
}
