import { afterEach, describe, expect, it } from 'vitest'
import { getPublicSupabaseConfig } from '@/lib/supabase/env'

const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const originalKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

afterEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = originalKey
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
})
