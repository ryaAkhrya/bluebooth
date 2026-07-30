import { afterEach, describe, expect, it } from 'vitest'
import {
  buildRoomShareUrl,
  getPublicAppUrl,
  getPublicSupabaseConfig,
  getSupabaseEnvironment,
} from '@/lib/supabase/env'

const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const originalKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL

afterEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = originalKey
  process.env.NEXT_PUBLIC_APP_URL = originalAppUrl
})

describe('Supabase environment configuration', () => {
  it('stays unconfigured when public variables are absent', () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    expect(getPublicSupabaseConfig()).toBeNull()
  })

  it('accepts a publishable key with a secure project URL', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://project.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_example'
    expect(getPublicSupabaseConfig()).toEqual({
      url: 'https://project.supabase.co',
      publishableKey: 'sb_publishable_example',
    })
  })

  it('allows the local Supabase HTTP endpoint', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:54321'
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'local-key'
    expect(getPublicSupabaseConfig()).not.toBeNull()
  })

  it('rejects insecure remote endpoints', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://example.com'
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'key'
    expect(getPublicSupabaseConfig()).toBeNull()
  })

  it('reports partial Supabase configuration as invalid', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://project.supabase.co'
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    expect(getSupabaseEnvironment()).toEqual({
      status: 'invalid',
      message: 'Both public Supabase environment variables must be configured together.',
    })
  })

  it('uses a validated app URL before a browser fallback', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://bluebooth.example/path'
    expect(getPublicAppUrl('http://localhost:3000')).toBe('https://bluebooth.example')
  })

  it('uses the browser origin when the app URL is unconfigured', () => {
    delete process.env.NEXT_PUBLIC_APP_URL
    expect(getPublicAppUrl('http://localhost:3000')).toBe('http://localhost:3000')
  })

  it('builds a room link without a hardcoded deployment domain', () => {
    delete process.env.NEXT_PUBLIC_APP_URL
    expect(buildRoomShareUrl('BLU482', 'http://localhost:3000')).toBe(
      'http://localhost:3000/r/BLU482',
    )
  })
})
