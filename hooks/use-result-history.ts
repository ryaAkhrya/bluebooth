'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSupabaseAuth } from '@/components/bluebooth/state/supabase-auth'
import { buildResultFilename } from '@/lib/bluebooth/image'
import { signedUrlNeedsRefresh } from '@/lib/bluebooth/result-history'
import { getBrowserSupabaseClient } from '@/lib/supabase/client'
import {
  deleteResult,
  listResultHistory,
  type ResultHistoryCursor,
  type ResultHistoryItem,
} from '@/lib/supabase/results'
import {
  createPrivateSignedUrlDetails,
  type PrivateSignedUrl,
} from '@/lib/supabase/storage'

export interface ResultHistoryViewItem extends ResultHistoryItem {
  thumbnail: PrivateSignedUrl
  thumbnailTransformed: boolean
}

export function useResultHistory() {
  const auth = useSupabaseAuth()
  const client = useMemo(() => getBrowserSupabaseClient(), [])
  const [items, setItems] = useState<ResultHistoryViewItem[]>([])
  const [cursor, setCursor] = useState<ResultHistoryCursor | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const requestRef = useRef(0)

  const signThumbnail = useCallback(
    async (item: ResultHistoryItem): Promise<ResultHistoryViewItem> => {
      if (!client) throw new Error('Online result history is unavailable.')
      let thumbnail: PrivateSignedUrl
      let thumbnailTransformed = true
      try {
        thumbnail = await createPrivateSignedUrlDetails(
          client,
          item.storagePath,
          {
            expiresInSeconds: 300,
            transform: {
              width: 360,
              height: 360,
              resize: 'contain',
              quality: 70,
            },
          },
        )
      } catch {
        thumbnailTransformed = false
        thumbnail = await createPrivateSignedUrlDetails(
          client,
          item.storagePath,
          { expiresInSeconds: 300 },
        )
      }
      return { ...item, thumbnail, thumbnailTransformed }
    },
    [client],
  )

  const loadPage = useCallback(
    async (nextCursor: ResultHistoryCursor | null, append: boolean) => {
      if (!client || auth.status !== 'ready') return
      const requestId = ++requestRef.current
      if (append) setLoadingMore(true)
      else setLoading(true)
      setError(null)
      try {
        const page = await listResultHistory(client, {
          limit: 12,
          cursor: nextCursor,
        })
        const signedItems = await Promise.all(page.items.map(signThumbnail))
        if (requestRef.current !== requestId) return
        setItems((current) =>
          append ? [...current, ...signedItems] : signedItems,
        )
        setCursor(page.nextCursor)
      } catch (cause) {
        if (requestRef.current !== requestId) return
        setError(
          cause instanceof Error
            ? cause.message
            : 'Private result history could not be loaded.',
        )
      } finally {
        if (requestRef.current === requestId) {
          setLoading(false)
          setLoadingMore(false)
        }
      }
    },
    [auth.status, client, signThumbnail],
  )

  const load = useCallback(
    () => loadPage(null, false),
    [loadPage],
  )
  const loadMore = useCallback(
    () => (cursor ? loadPage(cursor, true) : Promise.resolve()),
    [cursor, loadPage],
  )

  const refreshExpiringThumbnails = useCallback(async () => {
    if (!client) return
    const expiring = items.filter((item) =>
      signedUrlNeedsRefresh(item.thumbnail.expiresAt),
    )
    if (expiring.length === 0) return
    const refreshed = await Promise.all(expiring.map(signThumbnail)).catch(
      () => null,
    )
    if (!refreshed) return
    const replacements = new Map(refreshed.map((item) => [item.id, item]))
    setItems((current) =>
      current.map((item) => replacements.get(item.id) ?? item),
    )
  }, [client, items, signThumbnail])

  useEffect(() => {
    if (items.length === 0) return
    const nextExpiry = Math.min(
      ...items.map((item) => item.thumbnail.expiresAt),
    )
    const delay = Math.max(1_000, nextExpiry - Date.now() - 30_000)
    const timer = window.setTimeout(() => {
      void refreshExpiringThumbnails()
    }, delay)
    return () => window.clearTimeout(timer)
  }, [items, refreshExpiringThumbnails])

  const download = useCallback(
    async (item: ResultHistoryViewItem) => {
      if (!client) return
      const filename = buildResultFilename(item.roomCode, new Date(item.createdAt))
      const signed = await createPrivateSignedUrlDetails(
        client,
        item.storagePath,
        { expiresInSeconds: 120, download: filename },
      )
      const anchor = document.createElement('a')
      anchor.href = signed.url
      anchor.download = filename
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
    },
    [client],
  )

  const useOriginalThumbnail = useCallback(
    async (item: ResultHistoryViewItem) => {
      if (!client || !item.thumbnailTransformed) return
      const thumbnail = await createPrivateSignedUrlDetails(
        client,
        item.storagePath,
        { expiresInSeconds: 300 },
      ).catch(() => null)
      if (!thumbnail) return
      setItems((current) =>
        current.map((candidate) =>
          candidate.id === item.id
            ? {
                ...candidate,
                thumbnail,
                thumbnailTransformed: false,
              }
            : candidate,
        ),
      )
    },
    [client],
  )

  const remove = useCallback(
    async (item: ResultHistoryViewItem) => {
      if (!client || !item.canDelete) {
        return { deleted: false, objectRemoved: false }
      }
      setDeletingId(item.id)
      setError(null)
      try {
        const outcome = await deleteResult(client, item.id)
        setItems((current) =>
          current.filter((candidate) => candidate.id !== item.id),
        )
        return { deleted: true, objectRemoved: outcome.objectRemoved }
      } catch (cause) {
        setError(
          cause instanceof Error
            ? cause.message
            : 'The result could not be deleted.',
        )
        return { deleted: false, objectRemoved: false }
      } finally {
        setDeletingId(null)
      }
    },
    [client],
  )

  useEffect(
    () => () => {
      requestRef.current += 1
    },
    [],
  )

  return {
    onlineAvailable: auth.status === 'ready' && client !== null,
    authStatus: auth.status,
    items,
    hasMore: cursor !== null,
    loading,
    loadingMore,
    deletingId,
    error,
    load,
    loadMore,
    download,
    useOriginalThumbnail,
    remove,
  }
}
