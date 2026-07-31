'use client'

import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
} from 'react'
import {
  ArrowRight,
  Copy,
  Heart,
  LayoutGrid,
  Plus,
  RotateCcw,
  Shuffle,
  Trash2,
  X,
} from 'lucide-react'
import { CompositionPreview } from '@/components/bluebooth/editor/composition-preview'
import { useCreativeStudio } from '@/components/bluebooth/creative/creative-workflow'
import { originalAssetId } from '@/lib/bluebooth/creative-studio'
import type { FrozenCaptureConfiguration, ResolvedSlotImage } from '@/types/capture'
import type { CustomFrame } from '@/types/bluebooth'

export interface CreativeStudioAsset {
  id: string
  shotIndex: number
  source: Exclude<ResolvedSlotImage, null>
}

export function CreativeStudio({
  studioKey,
  assets,
  slotCount,
  stream,
  configuration,
  initialMode,
  customFrameResource,
  editable,
  onRetake,
  onContinue,
}: {
  studioKey: string
  assets: readonly CreativeStudioAsset[]
  slotCount: number
  stream: MediaStream | null
  configuration?: FrozenCaptureConfiguration
  initialMode?: 'quick' | 'creative'
  customFrameResource?: { frame: CustomFrame; source: string } | null
  editable: boolean
  onRetake: (shotIndex: number) => void
  onContinue: () => void
}) {
  const creative = useCreativeStudio()
  const initializeStudio = creative.initializeStudio
  const assetIds = useMemo(() => assets.map((asset) => asset.id), [assets])

  useEffect(() => {
    if (assetIds.length === 0) return
    initializeStudio(studioKey, assetIds, slotCount, initialMode)
  }, [assetIds, initialMode, initializeStudio, slotCount, studioKey])

  const assetMap = useMemo(
    () => new Map(assets.map((asset) => [asset.id, asset])),
    [assets],
  )
  const draft = creative.draft?.key === studioKey ? creative.draft : null
  const resolvedSlots = useMemo(
    () =>
      draft?.assignments.map((id) =>
        id ? assetMap.get(originalAssetId(id))?.source ?? null : null,
      ) ?? Array<ResolvedSlotImage>(slotCount).fill(null),
    [assetMap, draft?.assignments, slotCount],
  )
  const gallery = useMemo(
    () =>
      (draft?.galleryIds ?? assetIds)
        .filter((id) => !draft?.hidden.includes(originalAssetId(id)))
        .map((id) => {
          const original = assetMap.get(originalAssetId(id))
          return original ? { ...original, id } : null
        })
        .filter((asset): asset is CreativeStudioAsset => asset !== null),
    [assetIds, assetMap, draft?.galleryIds, draft?.hidden],
  )
  const complete = Boolean(
    draft && draft.assignments.length > 0 && draft.assignments.every(Boolean),
  )

  const dropOnSlot = useCallback(
    (event: DragEvent, slotIndex: number) => {
      event.preventDefault()
      if (!editable) return
      const sourceSlot = event.dataTransfer.getData('application/x-ldroll-slot')
      if (sourceSlot) {
        creative.swapSlots(Number(sourceSlot), slotIndex)
        return
      }
      const assetId = event.dataTransfer.getData('application/x-ldroll-asset')
      if (assetId) creative.assignAsset(assetId, slotIndex)
    },
    [creative, editable],
  )

  return (
    <div className="bb-creative-studio">
      <aside className="bb-studio-slots" aria-label="Template slots">
        <header>
          <span className="bb-editor-label">Template</span>
          <strong>{slotCount} slots</strong>
        </header>
        <div className="bb-slot-stack">
          {Array.from({ length: slotCount }, (_, index) => {
            const source = resolvedSlots[index]
            const selected = draft?.activeSlot === index
            return (
              <div
                className={`bb-studio-slot${selected ? ' is-active' : ''}${source ? ' is-filled' : ''}`}
                key={index}
                draggable={editable && Boolean(source)}
                onDragStart={(event) => {
                  event.dataTransfer.setData('application/x-ldroll-slot', String(index))
                }}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => dropOnSlot(event, index)}
              >
                <button
                  type="button"
                  aria-label={`Select slot ${index + 1}`}
                  aria-pressed={selected}
                  onClick={() => creative.selectSlot(index)}
                >
                  {source ? <StudioImage source={source} alt="" /> : <Plus />}
                  <span>{String(index + 1).padStart(2, '0')}</span>
                </button>
                {editable && source && (
                  <button
                    type="button"
                    className="bb-slot-clear"
                    aria-label={`Clear slot ${index + 1}`}
                    onClick={() => creative.clearSlot(index)}
                  >
                    <X />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </aside>

      <section className="bb-studio-canvas" aria-label="Composition preview">
        <header className="bb-studio-toolbar">
          <div>
            <span className="bb-editor-label">Creative Studio</span>
            <strong>Arrange the memory your way</strong>
          </div>
          {editable && (
            <div>
              <button type="button" className="bb-secondary-button" onClick={creative.autoFill}>
                <LayoutGrid /> Auto fill
              </button>
              <button type="button" className="bb-secondary-button" onClick={creative.shuffle}>
                <Shuffle /> Shuffle
              </button>
            </div>
          )}
        </header>
        <div className="bb-studio-composition">
          <CompositionPreview
            stream={stream}
            captured
            capturedSources={resolvedSlots}
            compositionConfiguration={configuration}
            customFrameResource={customFrameResource}
            suppressLocalCustomFrame={Boolean(configuration)}
          />
        </div>
        <footer className="bb-studio-footer">
          <span>
            {draft?.assignments.filter(Boolean).length ?? 0}/{slotCount} slots filled
          </span>
          {editable ? (
            <button
              type="button"
              className="bb-primary-button"
              disabled={!complete}
              onClick={onContinue}
            >
              Export composition <ArrowRight />
            </button>
          ) : (
            <span>Following the host&apos;s composition</span>
          )}
        </footer>
      </section>

      <aside className="bb-studio-gallery" aria-label="Captured photo gallery">
        <header>
          <div>
            <span className="bb-editor-label">Gallery</span>
            <strong>{gallery.length} memories</strong>
          </div>
          <small>Drag or choose Use</small>
        </header>
        <VirtualizedGallery
          assets={gallery}
          favorites={draft?.favorites ?? []}
          editable={editable}
          onUse={creative.assignAsset}
          onFavorite={creative.toggleFavorite}
          onRetake={(asset) => onRetake(asset.shotIndex)}
          onDelete={creative.hideAsset}
          onDuplicate={creative.duplicateAsset}
        />
      </aside>
    </div>
  )
}

const VirtualizedGallery = memo(function VirtualizedGallery({
  assets,
  favorites,
  editable,
  onUse,
  onFavorite,
  onRetake,
  onDelete,
  onDuplicate,
}: {
  assets: readonly CreativeStudioAsset[]
  favorites: readonly string[]
  editable: boolean
  onUse: (assetId: string) => void
  onFavorite: (assetId: string) => void
  onRetake: (asset: CreativeStudioAsset) => void
  onDelete: (assetId: string) => void
  onDuplicate: (assetId: string) => void
}) {
  const rowHeight = 172
  const columns = 2
  const viewportRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const startRow = Math.max(0, Math.floor(scrollTop / rowHeight) - 1)
  const visibleRows = 5
  const endIndex = Math.min(assets.length, (startRow + visibleRows) * columns)
  const startIndex = startRow * columns
  const visible = assets.slice(startIndex, endIndex)
  const totalHeight = Math.ceil(assets.length / columns) * rowHeight

  return (
    <div
      ref={viewportRef}
      className="bb-virtual-gallery"
      onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
    >
      <div style={{ height: totalHeight }}>
        {visible.map((asset, visibleIndex) => {
          const index = startIndex + visibleIndex
          const row = Math.floor(index / columns)
          const column = index % columns
          return (
            <GalleryCard
              key={asset.id}
              asset={asset}
              favorite={favorites.includes(originalAssetId(asset.id))}
              editable={editable}
              style={{ left: `${column * 50}%`, transform: `translate3d(0, ${row * rowHeight}px, 0)` }}
              onUse={onUse}
              onFavorite={onFavorite}
              onRetake={onRetake}
              onDelete={onDelete}
              onDuplicate={onDuplicate}
            />
          )
        })}
      </div>
    </div>
  )
})

const GalleryCard = memo(function GalleryCard({
  asset,
  favorite,
  editable,
  style,
  onUse,
  onFavorite,
  onRetake,
  onDelete,
  onDuplicate,
}: {
  asset: CreativeStudioAsset
  favorite: boolean
  editable: boolean
  style: { left: string; transform: string }
  onUse: (assetId: string) => void
  onFavorite: (assetId: string) => void
  onRetake: (asset: CreativeStudioAsset) => void
  onDelete: (assetId: string) => void
  onDuplicate: (assetId: string) => void
}) {
  return (
    <article
      className="bb-gallery-card"
      style={style}
      draggable={editable}
      onDragStart={(event) => {
        event.dataTransfer.setData('application/x-ldroll-asset', asset.id)
        event.dataTransfer.effectAllowed = 'copy'
      }}
    >
      <div className="bb-gallery-preview">
        <StudioImage source={asset.source} alt={`Captured memory ${asset.shotIndex + 1}`} />
        <span>{String(asset.shotIndex + 1).padStart(2, '0')}</span>
      </div>
      {editable && (
        <div className="bb-gallery-actions">
          <button type="button" aria-label="Use photo" onClick={() => onUse(asset.id)}><Plus /></button>
          <button type="button" aria-label={favorite ? 'Remove favorite' : 'Favorite photo'} aria-pressed={favorite} onClick={() => onFavorite(asset.id)}><Heart /></button>
          <button type="button" aria-label="Retake photo" onClick={() => onRetake(asset)}><RotateCcw /></button>
          <button type="button" aria-label="Duplicate photo" onClick={() => onDuplicate(asset.id)}><Copy /></button>
          <button type="button" aria-label="Delete photo" onClick={() => onDelete(asset.id)}><Trash2 /></button>
        </div>
      )}
    </article>
  )
})

const StudioImage = memo(function StudioImage({
  source,
  alt,
}: {
  source: Exclude<ResolvedSlotImage, null>
  alt: string
}) {
  if (typeof source === 'string') {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={source} alt={alt} loading="lazy" />
  }
  return (
    <span className="bb-studio-split" role="img" aria-label={alt}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={source.left} alt="" loading="lazy" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={source.right} alt="" loading="lazy" />
    </span>
  )
})
