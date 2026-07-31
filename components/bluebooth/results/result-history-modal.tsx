'use client'

import { Download, History, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Modal } from '@/components/bluebooth/ui/modal'
import { useToast } from '@/components/bluebooth/ui/toast-provider'
import { useLocalResult } from '@/hooks/use-local-result'
import {
  useResultHistory,
  type ResultHistoryViewItem,
} from '@/hooks/use-result-history'
import { getResultHistoryDisplay } from '@/lib/bluebooth/result-history'

export function ResultHistoryModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const history = useResultHistory()
  const local = useLocalResult()
  const toast = useToast()
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const loadOnlineHistory = history.load
  const onlineAvailable = history.onlineAvailable
  const loadLocalResult = local.load

  useEffect(() => {
    if (!open) return
    void loadLocalResult()
    if (onlineAvailable) void loadOnlineHistory()
  }, [loadLocalResult, loadOnlineHistory, onlineAvailable, open])

  const remove = async (item: ResultHistoryViewItem) => {
    const outcome = await history.remove(item)
    setConfirmingId(null)
    if (!outcome.deleted) return
    if (outcome.objectRemoved) {
      toast('Result deleted.', 'success')
    } else {
      toast(
        'Result removed from history. Storage cleanup is pending.',
        'success',
      )
    }
  }

  return (
    <Modal open={open} title="Private result history" onClose={onClose}>
      <div className="bb-history">
        {history.authStatus === 'loading' && (
          <p className="bb-empty-state">Connecting to private history…</p>
        )}

        {history.onlineAvailable && (
          <>
            <p className="bb-history-note">
              <History />
              History is private and tied to this browser&apos;s anonymous
              identity.
            </p>
            {history.loading ? (
              <p className="bb-empty-state">Loading results…</p>
            ) : history.items.length > 0 ? (
              <div className="bb-history-grid">
                {history.items.map((item) => {
                  const display = getResultHistoryDisplay(
                    item.metadata,
                    item.width,
                    item.height,
                  )
                  const confirming = confirmingId === item.id
                  return (
                    <article className="bb-history-card" key={item.id}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.thumbnail.url}
                        alt={`Bluebooth result from ${new Date(item.createdAt).toLocaleDateString()}`}
                        loading="lazy"
                        onError={() => {
                          void history.useOriginalThumbnail(item)
                        }}
                      />
                      <div className="bb-history-card-copy">
                        <strong>{item.roomName}</strong>
                        <small>
                          {new Date(item.createdAt).toLocaleDateString()} ·{' '}
                          {display.gridName} · {display.ratio}
                        </small>
                        <small>
                          {item.width}×{item.height} px · Room {item.roomCode}
                        </small>
                      </div>
                      <div className="bb-history-actions">
                        <button
                          className="bb-primary-button"
                          onClick={() => {
                            void history
                              .download(item)
                              .catch(() =>
                                toast('Download link could not be created.', 'error'),
                              )
                          }}
                        >
                          <Download /> Download
                        </button>
                        {item.canDelete &&
                          (confirming ? (
                            <>
                              <button
                                className="bb-secondary-button"
                                disabled={history.deletingId === item.id}
                                onClick={() => void remove(item)}
                              >
                                Confirm delete
                              </button>
                              <button
                                className="bb-text-button"
                                disabled={history.deletingId === item.id}
                                onClick={() => setConfirmingId(null)}
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <button
                              className="bb-text-button is-danger"
                              onClick={() => setConfirmingId(item.id)}
                            >
                              <Trash2 /> Delete
                            </button>
                          ))}
                      </div>
                    </article>
                  )
                })}
              </div>
            ) : (
              <p className="bb-empty-state">No private online results yet.</p>
            )}
            {history.error && (
              <div className="bb-history-error" role="status">
                <span>{history.error}</span>
                <button
                  className="bb-secondary-button"
                  onClick={() => void history.load()}
                >
                  Retry
                </button>
              </div>
            )}
            {history.hasMore && (
              <button
                className="bb-secondary-button bb-history-more"
                disabled={history.loadingMore}
                onClick={() => void history.loadMore()}
              >
                {history.loadingMore ? 'Loading…' : 'Load more'}
              </button>
            )}
          </>
        )}

        {history.authStatus !== 'loading' &&
          (!history.onlineAvailable || local.result) && (
          <section className="bb-local-history">
            <h3>Saved in this browser</h3>
            {local.result ? (
              <div className="bb-previous-result">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={local.result.image}
                  alt={`Bluebooth result from ${new Date(local.result.createdAt).toLocaleDateString()}`}
                />
                <strong>{local.result.roomName}</strong>
                <small>
                  {local.result.gridName} ·{' '}
                  {local.result.dimensions.join('×')}
                </small>
                <a
                  className="bb-primary-button"
                  href={local.result.image}
                  download={`bluebooth-${local.result.code}.png`}
                >
                  <Download /> Download
                </a>
              </div>
            ) : (
              <p className="bb-empty-state">No saved result yet.</p>
            )}
          </section>
        )}
      </div>
    </Modal>
  )
}
