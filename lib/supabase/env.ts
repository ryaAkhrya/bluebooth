export interface PublicSupabaseConfig {
  url: string
  publishableKey: string
}

export type SupabaseEnvironment =
  | { status: 'configured'; config: PublicSupabaseConfig }
  | { status: 'unconfigured' }
  | { status: 'invalid'; message: string }

function parseWebUrl(value: string): URL | null {
  try {
    const parsed = new URL(value)
    if (parsed.protocol === 'https:') return parsed
    if (
      parsed.protocol === 'http:' &&
      (parsed.hostname === '127.0.0.1' || parsed.hostname === 'localhost')
    ) {
      return parsed
    }
  } catch {
    return null
  }
  return null
}

export function getSupabaseEnvironment(): SupabaseEnvironment {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? ''
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ?? ''

  if (!url && !publishableKey) return { status: 'unconfigured' }
  if (!url || !publishableKey) {
    return {
      status: 'invalid',
      message: 'Both public Supabase environment variables must be configured together.',
    }
  }
  if (!parseWebUrl(url)) {
    return {
      status: 'invalid',
      message: 'The public Supabase URL must use HTTPS or a local HTTP address.',
    }
  }
  return { status: 'configured', config: { url, publishableKey } }
}

export function getPublicSupabaseConfig(): PublicSupabaseConfig | null {
  const environment = getSupabaseEnvironment()
  return environment.status === 'configured' ? environment.config : null
}

export function getPublicAppUrl(browserOrigin?: string): string | null {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim()
  const candidate = configured || browserOrigin?.trim()
  if (!candidate) return null
  const parsed = parseWebUrl(candidate)
  if (!parsed) return null
  return parsed.origin
}

export function buildRoomShareUrl(code: string, browserOrigin?: string): string {
  const baseUrl = getPublicAppUrl(browserOrigin)
  return baseUrl ? `${baseUrl}/r/${encodeURIComponent(code)}` : `/r/${encodeURIComponent(code)}`
}
