import { describe, expect, it } from 'vitest'
import {
  captureStoragePath,
  customFrameStoragePath,
  resultStoragePath,
} from '@/lib/supabase/storage'

const roomId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const sessionId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const userId = '11111111-1111-4111-8111-111111111111'

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
})
