import { describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  deleteResult,
  listResultHistory,
} from '@/lib/supabase/results'
import type { Database } from '@/types/database'

function authenticatedClient(input: {
  rpc: ReturnType<typeof vi.fn>
  remove?: ReturnType<typeof vi.fn>
}) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      }),
    },
    rpc: input.rpc,
    storage: {
      from: () => ({
        remove:
          input.remove ??
          vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    },
  } as unknown as SupabaseClient<Database>
}

describe('private result history service', () => {
  it('maps a bounded page and returns a stable cursor', async () => {
    const rows = [0, 1, 2].map((index) => ({
      result_id: `result-${index}`,
      session_id: `session-${index}`,
      room_id: `room-${index}`,
      room_code: `ROOM0${index}`,
      room_name: 'Bluebooth',
      storage_path: `result-${index}/final.png`,
      width: 1080,
      height: 1080,
      metadata: {},
      created_at: new Date(
        Date.UTC(2026, 6, 31 - index),
      ).toISOString(),
      can_delete: index === 0,
    }))
    const rpc = vi.fn().mockResolvedValue({ data: rows, error: null })
    const page = await listResultHistory(authenticatedClient({ rpc }), {
      limit: 2,
    })

    expect(page.items).toHaveLength(2)
    expect(page.items[0]).toMatchObject({
      id: 'result-0',
      roomCode: 'ROOM00',
      canDelete: true,
    })
    expect(page.nextCursor).toEqual({
      createdAt: '2026-07-30T00:00:00.000Z',
      resultId: 'result-1',
    })
    expect(rpc).toHaveBeenCalledWith('list_result_history', {
      p_limit: 3,
      p_before_created_at: null,
      p_before_id: null,
    })
  })

  it('soft-deletes metadata before removing the private object', async () => {
    const calls: string[] = []
    const result = {
      id: 'result-id',
      session_id: 'session-id',
      room_id: 'room-id',
      created_by: 'user-id',
      storage_path: 'rooms/room-id/sessions/session-id/result/final.png',
      width: 1080,
      height: 1080,
      metadata: {},
      created_at: '2026-07-31T00:00:00Z',
      deleted_at: '2026-07-31T01:00:00Z',
    }
    const rpc = vi.fn().mockImplementation(async () => {
      calls.push('metadata')
      return { data: result, error: null }
    })
    const remove = vi.fn().mockImplementation(async () => {
      calls.push('object')
      return { data: [], error: null }
    })

    await expect(
      deleteResult(authenticatedClient({ rpc, remove }), 'result-id'),
    ).resolves.toEqual({ result, objectRemoved: true })
    expect(calls).toEqual(['metadata', 'object'])
  })

  it('keeps a successful soft delete when object cleanup must retry', async () => {
    const result = {
      id: 'result-id',
      session_id: 'session-id',
      room_id: 'room-id',
      created_by: 'user-id',
      storage_path: 'rooms/room-id/sessions/session-id/result/final.png',
      width: 1080,
      height: 1080,
      metadata: {},
      created_at: '2026-07-31T00:00:00Z',
      deleted_at: '2026-07-31T01:00:00Z',
    }
    const rpc = vi.fn().mockResolvedValue({ data: result, error: null })
    const remove = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'temporary failure', name: 'StorageError' },
    })

    await expect(
      deleteResult(authenticatedClient({ rpc, remove }), 'result-id'),
    ).resolves.toEqual({ result, objectRemoved: false })
  })
})
