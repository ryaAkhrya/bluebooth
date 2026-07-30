import { describe, expect, it } from 'vitest'
import { resolvePreviewFeed } from '@/lib/bluebooth/preview-sources'

describe('host-relative preview sources', () => {
  it('maps the host source to local video for the host', () => {
    expect(resolvePreviewFeed('host', 'host')).toBe('local')
    expect(resolvePreviewFeed('partner', 'host')).toBe('remote')
  })

  it('maps the same host source to remote video for the partner', () => {
    expect(resolvePreviewFeed('host', 'partner')).toBe('remote')
    expect(resolvePreviewFeed('partner', 'partner')).toBe('local')
  })
})
