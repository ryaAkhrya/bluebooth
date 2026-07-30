import { describe, expect, it, vi } from 'vitest'
import { withBoundedRetry } from '@/lib/bluebooth/retry'

describe('bounded retry', () => {
  it('retries an idempotent operation without exceeding the limit', async () => {
    const operation = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error('temporary'))
      .mockResolvedValue('saved')
    const wait = vi.fn(async () => {})

    await expect(
      withBoundedRetry(operation, { attempts: 3, wait }),
    ).resolves.toBe('saved')
    expect(operation).toHaveBeenCalledTimes(2)
    expect(wait).toHaveBeenCalledTimes(1)
  })
})
