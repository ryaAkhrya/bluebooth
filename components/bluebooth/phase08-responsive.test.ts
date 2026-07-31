import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const css = readFileSync(
  new URL('./bluebooth.css', import.meta.url),
  'utf8',
)

describe('Phase 08 responsive safeguards', () => {
  it('keeps safe-area and dynamic viewport handling in the mobile shell', () => {
    expect(css).toContain('env(safe-area-inset-bottom)')
    expect(css).toContain('env(safe-area-inset-left)')
    expect(css).toContain('env(safe-area-inset-right)')
    expect(css).toContain('100dvh')
  })

  it('contains dedicated portrait and short-landscape layouts', () => {
    expect(css).toContain('@media (max-width: 640px)')
    expect(css).toContain(
      '@media (max-height: 520px) and (orientation: landscape)',
    )
    expect(css).toMatch(
      /\.bb-preview-panel \{ position: sticky;[^}]*top: 72px;/,
    )
  })
})
