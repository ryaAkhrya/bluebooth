import { afterEach, describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  captureStoragePath,
  createPrivateSignedUrlDetails,
  customFrameStoragePath,
  removePrivateObjects,
  resultStoragePath,
} from '@/lib/supabase/storage'
import type { Database } from '@/types/database'

const roomId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const sessionId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const userId = '11111111-1111-4111-8111-111111111111'

afterEach(() => {
  vi.useRealTimers()
})

describe('private media paths', () => {
  it('builds an owner-scoped raw capture path', () => {
    expect(
      captureStoragePath({
        roomId,
        sessionId,
        userId,
        shotIndex: 2,
        mimeType: 'image/webp',
      }),
    ).toBe(
      `rooms/${roomId}/sessions/${sessionId}/raw/${userId}/2.webp`,
    )
  })

  it('builds owner-scoped custom frame and host result paths', () => {
    const fileId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
    expect(
      customFrameStoragePath({
        roomId,
        sessionId,
        userId,
        fileId,
        mimeType: 'image/png',
      }),
    ).toBe(`rooms/${roomId}/sessions/${sessionId}/frames/${userId}/${fileId}.png`)
    expect(resultStoragePath(roomId, sessionId)).toBe(
      `rooms/${roomId}/sessions/${sessionId}/result/final.png`,
    )
  })

  it('rejects malformed identifiers and shot indexes', () => {
    expect(() =>
      captureStoragePath({
        roomId: 'not-a-room',
        sessionId,
        userId,
        shotIndex: 0,
        mimeType: 'image/jpeg',
      }),
    ).toThrow('Room id must be a UUID')
    expect(() =>
      captureStoragePath({
        roomId,
        sessionId,
        userId,
        shotIndex: 64,
        mimeType: 'image/jpeg',
      }),
    ).toThrow('Shot index is invalid')
  })

  it('returns an expiring transformed private thumbnail URL', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-31T00:00:00Z'))
    const createSignedUrl = vi.fn().mockResolvedValue({
      data: { signedUrl: 'https://private.example/thumbnail' },
      error: null,
    })
    const client = {
      storage: {
        from: () => ({ createSignedUrl }),
      },
    } as unknown as SupabaseClient<Database>

    await expect(
      createPrivateSignedUrlDetails(client, 'private/final.png', {
        expiresInSeconds: 300,
        transform: { width: 360, height: 360, resize: 'contain', quality: 70 },
      }),
    ).resolves.toEqual({
      url: 'https://private.example/thumbnail',
      expiresAt: Date.parse('2026-07-31T00:05:00Z'),
    })
    expect(createSignedUrl).toHaveBeenCalledWith('private/final.png', 300, {
      download: undefined,
      transform: { width: 360, height: 360, resize: 'contain', quality: 70 },
    })
  })

  it('removes only the explicit private object paths', async () => {
    const remove = vi.fn().mockResolvedValue({ data: [], error: null })
    const client = {
      storage: {
        from: () => ({ remove }),
      },
    } as unknown as SupabaseClient<Database>

    await removePrivateObjects(client, ['one/final.png'])
    expect(remove).toHaveBeenCalledWith(['one/final.png'])
  })
})
