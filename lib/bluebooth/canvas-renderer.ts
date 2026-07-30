import { getCompositionGeometry, type SlotRect } from '@/lib/bluebooth/geometry'
import { getImageDrawPlan } from '@/lib/bluebooth/image'
import type {
  CustomFrame,
  FrameOptions,
  FramePreset,
  GridPreset,
  LayoutSettings,
} from '@/types/bluebooth'
import type { ResolvedSlotImage } from '@/types/capture'

export type RenderLayer = 'background' | 'behindFrame' | 'photos' | 'frame' | 'frontFrame' | 'text'

export interface RenderCompositionInput {
  preset: GridPreset
  frame: FramePreset
  layout: LayoutSettings
  frameOptions: FrameOptions
  customFrame: (CustomFrame & { source: string }) | null
  slotImages: readonly ResolvedSlotImage[]
  roomCode: string
  roomName: string
  date?: Date
}

export function getRenderLayerOrder(customFrame: CustomFrame | null): RenderLayer[] {
  return [
    'background',
    ...(customFrame && !customFrame.front ? ['behindFrame' as const] : []),
    'photos',
    'frame',
    ...(customFrame?.front ? ['frontFrame' as const] : []),
    'text',
  ]
}

export function configureCompositionImageCors(
  image: Pick<HTMLImageElement, 'crossOrigin'>,
) {
  image.crossOrigin = 'anonymous'
}

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    configureCompositionImageCors(image)
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('An image required for composition could not be decoded'))
    image.src = source
  })
}

function pathRoundedRect(
  context: CanvasRenderingContext2D,
  rect: Pick<SlotRect, 'x' | 'y' | 'width' | 'height' | 'radius'>,
) {
  context.beginPath()
  context.roundRect(rect.x, rect.y, rect.width, rect.height, rect.radius)
}

function drawImageInRect(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  rect: Pick<SlotRect, 'x' | 'y' | 'width' | 'height'>,
) {
  const plan = getImageDrawPlan(
    image.naturalWidth,
    image.naturalHeight,
    rect.width,
    rect.height,
    'cover',
  )
  context.drawImage(
    image,
    plan.sourceX,
    plan.sourceY,
    plan.sourceWidth,
    plan.sourceHeight,
    rect.x + plan.destinationX,
    rect.y + plan.destinationY,
    plan.destinationWidth,
    plan.destinationHeight,
  )
}

function drawCustomFrame(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  frame: CustomFrame,
  width: number,
  height: number,
) {
  const plan = getImageDrawPlan(image.naturalWidth, image.naturalHeight, width, height, frame.fit)
  const scale = frame.scale / 100
  const drawWidth = plan.destinationWidth * scale
  const drawHeight = plan.destinationHeight * scale
  const x =
    plan.destinationX +
    (plan.destinationWidth - drawWidth) / 2 +
    (frame.x / 100) * width
  const y =
    plan.destinationY +
    (plan.destinationHeight - drawHeight) / 2 +
    (frame.y / 100) * height
  context.save()
  context.globalAlpha = frame.opacity / 100
  context.drawImage(
    image,
    plan.sourceX,
    plan.sourceY,
    plan.sourceWidth,
    plan.sourceHeight,
    x,
    y,
    drawWidth,
    drawHeight,
  )
  context.restore()
}

function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error('The final PNG could not be encoded')),
      'image/png',
    )
  })
}

export async function renderComposition(
  canvas: HTMLCanvasElement,
  input: RenderCompositionInput,
): Promise<Blob> {
  const { preset, frame, layout, frameOptions, customFrame } = input
  const geometry = getCompositionGeometry({
    preset,
    frame,
    layout,
    showDate: frameOptions.showDate,
    showRoom: frameOptions.showRoom,
  })
  canvas.width = geometry.width
  canvas.height = geometry.height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas is unavailable')

  const imagePromises = geometry.slots.map(async (_, index) => {
    const source = input.slotImages[index]
    if (!source) return null
    if (typeof source === 'string') return loadImage(source)
    const [left, right] = await Promise.all([
      loadImage(source.left),
      loadImage(source.right),
    ])
    return {
      left,
      right,
    }
  })
  const customFramePromise = customFrame ? loadImage(customFrame.source) : Promise.resolve(null)
  const [images, customFrameImage] = await Promise.all([
    Promise.all(imagePromises),
    customFramePromise,
  ])

  context.fillStyle = frame.background || layout.background
  context.fillRect(0, 0, geometry.width, geometry.height)
  if (frame.check) {
    context.fillStyle = 'rgba(255,255,255,.22)'
    const size = 28 * geometry.scale
    for (let y = 0; y < geometry.height; y += size) {
      for (let x = 0; x < geometry.width; x += size) {
        if ((x / size + y / size) % 2 === 0) context.fillRect(x, y, size, size)
      }
    }
  }
  context.fillStyle = layout.background
  context.fillRect(
    geometry.framePadding,
    geometry.framePadding,
    geometry.width - geometry.framePadding * 2,
    geometry.height - geometry.framePadding * 2,
  )
  if (customFrame && customFrameImage && !customFrame.front) {
    drawCustomFrame(context, customFrameImage, customFrame, geometry.width, geometry.height)
  }

  geometry.slots.forEach((rect, index) => {
    context.save()
    pathRoundedRect(context, rect)
    context.clip()
    const image = images[index]
    if (image instanceof HTMLImageElement) {
      drawImageInRect(context, image, rect)
    } else if (image) {
      const halfWidth = rect.width / 2
      context.save()
      context.beginPath()
      context.rect(rect.x, rect.y, halfWidth, rect.height)
      context.clip()
      drawImageInRect(context, image.left, {
        x: rect.x,
        y: rect.y,
        width: halfWidth,
        height: rect.height,
      })
      context.restore()
      context.save()
      context.beginPath()
      context.rect(rect.x + halfWidth, rect.y, halfWidth, rect.height)
      context.clip()
      drawImageInRect(context, image.right, {
        x: rect.x + halfWidth,
        y: rect.y,
        width: halfWidth,
        height: rect.height,
      })
      context.restore()
    } else {
      const gradient = context.createLinearGradient(
        rect.x,
        rect.y,
        rect.x + rect.width,
        rect.y + rect.height,
      )
      gradient.addColorStop(0, '#dceeff')
      gradient.addColorStop(1, '#8fc5ff')
      context.fillStyle = gradient
      context.fillRect(rect.x, rect.y, rect.width, rect.height)
    }
    context.restore()

    const customBorder = frameOptions.borderWidth * geometry.scale * 0.5
    if (customBorder > 0) {
      context.save()
      pathRoundedRect(context, rect)
      context.strokeStyle = frameOptions.borderColor
      context.lineWidth = customBorder
      context.stroke()
      context.restore()
    }
  })

  if (frame.border > 0) {
    context.save()
    const lineWidth = Math.max(2, frame.border * geometry.scale)
    const inset = lineWidth / 2
    context.strokeStyle = frame.borderColor
    context.lineWidth = lineWidth
    context.strokeRect(inset, inset, geometry.width - lineWidth, geometry.height - lineWidth)
    if (frame.inner) {
      const innerInset = inset + lineWidth * 1.8
      context.strokeRect(
        innerInset,
        innerInset,
        geometry.width - innerInset * 2,
        geometry.height - innerInset * 2,
      )
    }
    context.restore()
  }

  if (customFrame?.front && customFrameImage) {
    drawCustomFrame(context, customFrameImage, customFrame, geometry.width, geometry.height)
  }

  if (frame.numbering) {
    geometry.slots.forEach((rect, index) => {
      context.fillStyle = 'rgba(23,36,58,.72)'
      context.font = `700 ${13 * geometry.scale}px system-ui`
      context.textAlign = 'left'
      context.textBaseline = 'middle'
      context.fillText(
        String(index + 1).padStart(2, '0'),
        rect.x + 10 * geometry.scale,
        rect.y + 16 * geometry.scale,
      )
    })
  }

  const caption =
    frameOptions.caption || (frameOptions.showRoom ? `Room ${input.roomCode}` : '')
  const date =
    frameOptions.showDate || frame.dateArea
      ? (input.date ?? new Date()).toLocaleDateString()
      : ''
  context.fillStyle = frame.film ? '#ffffff' : '#17243a'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.font = `600 ${13 * geometry.scale}px system-ui`
  if (geometry.topBand) {
    context.fillText(
      caption || input.roomName,
      geometry.width / 2,
      geometry.padding + geometry.topBand / 2,
    )
  }
  if (geometry.bottomBand) {
    context.fillText(
      [caption, date].filter(Boolean).join(' · '),
      geometry.width / 2,
      geometry.height - geometry.padding - geometry.bottomBand / 2,
    )
  }
  return canvasToPngBlob(canvas)
}
