import type { SupabaseClient } from '@supabase/supabase-js'
import { SupabaseServiceError } from '@/lib/supabase/errors'
import type { Database } from '@/types/database'

export const BLUEBOOTH_MEDIA_BUCKET = 'bluebooth-media'

export interface PrivateSignedUrl {
  url: string
  expiresAt: number
}

export interface PrivateSignedUrlOptions {
  expiresInSeconds?: number
  download?: string | boolean
  transform?: {
    width?: number
    height?: number
    resize?: 'cover' | 'contain' | 'fill'
    quality?: number
  }
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function requireUuid(value: string, label: string): string {
  if (!UUID_PATTERN.test(value)) throw new SupabaseServiceError(`${label} must be a UUID`)
  return value.toLowerCase()
}

export function captureStoragePath(input: {
  roomId: string
  sessionId: string
  userId: string
  shotIndex: number
  mimeType: 'image/webp' | 'image/jpeg'
}): string {
  if (!Number.isInteger(input.shotIndex) || input.shotIndex < 0 || input.shotIndex > 63) {
    throw new SupabaseServiceError('Shot index is invalid')
  }
  const extension = input.mimeType === 'image/webp' ? 'webp' : 'jpg'
  return `rooms/${requireUuid(input.roomId, 'Room id')}/sessions/${requireUuid(input.sessionId, 'Session id')}/raw/${requireUuid(input.userId, 'User id')}/${input.shotIndex}.${extension}`
}

export function customFrameStoragePath(input: {
  roomId: string
  sessionId: string
  userId: string
  fileId: string
  mimeType: 'image/png' | 'image/webp'
}): string {
  const extension = input.mimeType === 'image/png' ? 'png' : 'webp'
  return `rooms/${requireUuid(input.roomId, 'Room id')}/sessions/${requireUuid(input.sessionId, 'Session id')}/frames/${requireUuid(input.userId, 'User id')}/${requireUuid(input.fileId, 'File id')}.${extension}`
}

export function resultStoragePath(roomId: string, sessionId: string): string {
  return `rooms/${requireUuid(roomId, 'Room id')}/sessions/${requireUuid(sessionId, 'Session id')}/result/final.png`
}

export async function uploadPrivateObject(
  client: SupabaseClient<Database>,
  input: {
    path: string
    body: Blob
    contentType: 'image/png' | 'image/webp' | 'image/jpeg'
    upsert?: boolean
  },
): Promise<string> {
  const { data, error } = await client.storage
    .from(BLUEBOOTH_MEDIA_BUCKET)
    .upload(input.path, input.body, {
      contentType: input.contentType,
      upsert: input.upsert ?? false,
      cacheControl: '3600',
    })
  if (error) throw new SupabaseServiceError(error.message, error.name)
  return data.path
}

export async function createPrivateSignedUrl(
  client: SupabaseClient<Database>,
  path: string,
  expiresInSeconds = 300,
): Promise<string> {
  const signed = await createPrivateSignedUrlDetails(client, path, {
    expiresInSeconds,
  })
  return signed.url
}

export async function createPrivateSignedUrlDetails(
  client: SupabaseClient<Database>,
  path: string,
  options: PrivateSignedUrlOptions = {},
): Promise<PrivateSignedUrl> {
  const safeExpiry = Math.min(
    3600,
    Math.max(60, Math.round(options.expiresInSeconds ?? 300)),
  )
  const createdAt = Date.now()
  const { data, error } = await client.storage
    .from(BLUEBOOTH_MEDIA_BUCKET)
    .createSignedUrl(path, safeExpiry, {
      download: options.download,
      transform: options.transform,
    })
  if (error) throw new SupabaseServiceError(error.message, error.name)
  return {
    url: data.signedUrl,
    expiresAt: createdAt + safeExpiry * 1000,
  }
}

export async function removePrivateObjects(
  client: SupabaseClient<Database>,
  paths: readonly string[],
): Promise<void> {
  if (paths.length === 0) return
  const { error } = await client.storage
    .from(BLUEBOOTH_MEDIA_BUCKET)
    .remove([...paths])
  if (error) throw new SupabaseServiceError(error.message, error.name)
}
