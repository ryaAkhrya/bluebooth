import {
  LAST_RESULT_ID,
  RESULT_DATABASE_NAME,
  RESULT_DATABASE_VERSION,
  RESULT_STORE_NAME,
} from '@/lib/bluebooth/constants'

export interface SavedResultMetadata {
  code: string
  roomName: string
  gridName: string
  dimensions: readonly [number, number]
  createdAt: string
}

interface StoredResult {
  id: typeof LAST_RESULT_ID
  blob: Blob
  metadata: SavedResultMetadata
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(RESULT_DATABASE_NAME, RESULT_DATABASE_VERSION)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(RESULT_STORE_NAME)) {
        request.result.createObjectStore(RESULT_STORE_NAME, { keyPath: 'id' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('IndexedDB could not be opened'))
  })
}

export async function saveLocalResult(
  blob: Blob,
  metadata: SavedResultMetadata,
): Promise<void> {
  const database = await openDatabase()
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(RESULT_STORE_NAME, 'readwrite')
      transaction.objectStore(RESULT_STORE_NAME).put({ id: LAST_RESULT_ID, blob, metadata })
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error ?? new Error('Result could not be saved'))
      transaction.onabort = () => reject(transaction.error ?? new Error('Result save was aborted'))
    })
  } finally {
    database.close()
  }
}

export async function loadLocalResult(): Promise<StoredResult | null> {
  const database = await openDatabase()
  try {
    return await new Promise<StoredResult | null>((resolve, reject) => {
      const transaction = database.transaction(RESULT_STORE_NAME, 'readonly')
      const request = transaction.objectStore(RESULT_STORE_NAME).get(LAST_RESULT_ID)
      request.onsuccess = () => resolve((request.result as StoredResult | undefined) ?? null)
      request.onerror = () => reject(request.error ?? new Error('Result could not be loaded'))
    })
  } finally {
    database.close()
  }
}
