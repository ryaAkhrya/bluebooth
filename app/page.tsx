import type { Metadata, Viewport } from 'next'
import { BlueboothApp } from '@/components/bluebooth/bluebooth-app'

export const metadata: Metadata = {
  title: 'LDRoll',
  description: 'A photobooth for people who are not in the same place.',
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#10152c',
}

export default function Page() {
  return <BlueboothApp />
}
