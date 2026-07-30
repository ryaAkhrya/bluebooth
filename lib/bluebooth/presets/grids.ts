import type { GridPreset } from '@/types/bluebooth'

export const GRID_PRESETS: readonly GridPreset[] = [
  { id: 'ig-square-1', name: 'Square Single', category: 'instagram', ratio: '1:1', output: [1080, 1080], columns: 1, rows: 1, areas: [['a']] },
  { id: 'ig-square-2', name: 'Square 2', category: 'instagram', ratio: '1:1', output: [1080, 1080], columns: 1, rows: 2, areas: [['a'], ['b']] },
  { id: 'ig-square-4', name: 'Square 4', category: 'instagram', ratio: '1:1', output: [1080, 1080], columns: 2, rows: 2, areas: [['a', 'b'], ['c', 'd']] },
  { id: 'ig-portrait-1', name: 'IG Portrait', category: 'instagram', ratio: '4:5', output: [1080, 1350], columns: 1, rows: 1, areas: [['a']] },
  { id: 'ig-portrait-2', name: 'Portrait 2', category: 'instagram', ratio: '4:5', output: [1080, 1350], columns: 1, rows: 2, areas: [['a'], ['b']] },
  { id: 'ig-portrait-3', name: 'Portrait 3', category: 'instagram', ratio: '4:5', output: [1080, 1350], columns: 1, rows: 3, areas: [['a'], ['b'], ['c']] },
  { id: 'ig-portrait-4', name: 'Portrait 4', category: 'instagram', ratio: '4:5', output: [1080, 1350], columns: 2, rows: 2, areas: [['a', 'b'], ['c', 'd']] },
  { id: 'ig-story-1', name: 'Story', category: 'instagram', ratio: '9:16', output: [1080, 1920], columns: 1, rows: 1, areas: [['a']] },
  { id: 'ig-story-2', name: 'Story 2', category: 'instagram', ratio: '9:16', output: [1080, 1920], columns: 1, rows: 2, areas: [['a'], ['b']] },
  { id: 'ig-story-3', name: 'Story 3', category: 'instagram', ratio: '9:16', output: [1080, 1920], columns: 1, rows: 3, areas: [['a'], ['b'], ['c']] },
  { id: 'ig-story-4', name: 'Story 4', category: 'instagram', ratio: '9:16', output: [1080, 1920], columns: 1, rows: 4, areas: [['a'], ['b'], ['c'], ['d']] },
  { id: 'strip-2', name: 'Classic Strip 2', category: 'portrait', ratio: '1:2', output: [600, 1200], columns: 1, rows: 2, areas: [['a'], ['b']] },
  { id: 'strip-3', name: 'Classic Strip 3', category: 'portrait', ratio: '1:2.6', output: [600, 1560], columns: 1, rows: 3, areas: [['a'], ['b'], ['c']] },
  { id: 'strip-4', name: 'Classic Strip 4', category: 'portrait', ratio: '1:2', output: [900, 1800], columns: 1, rows: 4, areas: [['a'], ['b'], ['c'], ['d']] },
  { id: 'tall-6', name: 'Tall Grid 6', category: 'portrait', ratio: '2:3', output: [1000, 1500], columns: 2, rows: 3, areas: [['a', 'b'], ['c', 'd'], ['e', 'f']] },
  { id: 'pc-2x2', name: 'Collage 2×2', category: 'portrait', ratio: '4:5', output: [1080, 1350], columns: 2, rows: 2, areas: [['a', 'b'], ['c', 'd']] },
  { id: 'pc-2x3', name: 'Collage 2×3', category: 'portrait', ratio: '2:3', output: [1000, 1500], columns: 2, rows: 3, areas: [['a', 'b'], ['c', 'd'], ['e', 'f']] },
  { id: 'large-top-2', name: 'Large Top · 2 Small', category: 'portrait', ratio: '4:5', output: [1080, 1350], columns: 2, rows: 2, areas: [['a', 'a'], ['b', 'c']] },
  { id: '2-small-large-bottom', name: '2 Small · Large Bottom', category: 'portrait', ratio: '4:5', output: [1080, 1350], columns: 2, rows: 2, areas: [['a', 'b'], ['c', 'c']] },
  { id: 'editorial-portrait', name: 'Editorial Portrait', category: 'portrait', ratio: '4:5', output: [1080, 1350], columns: 3, rows: 3, areas: [['a', 'a', 'b'], ['a', 'a', 'c'], ['d', 'd', 'd']] },
  { id: 'land-1', name: 'Landscape Single', category: 'landscape', ratio: '16:9', output: [1600, 900], columns: 1, rows: 1, areas: [['a']] },
  { id: 'land-2', name: 'Landscape 2', category: 'landscape', ratio: '16:9', output: [1600, 900], columns: 2, rows: 1, areas: [['a', 'b']] },
  { id: 'land-3', name: 'Landscape 3', category: 'landscape', ratio: '16:9', output: [1600, 900], columns: 3, rows: 1, areas: [['a', 'b', 'c']] },
  { id: 'land-2x2', name: 'Landscape 2×2', category: 'landscape', ratio: '16:9', output: [1600, 900], columns: 2, rows: 2, areas: [['a', 'b'], ['c', 'd']] },
  { id: 'wide-main-2-side', name: 'Wide Main · 2 Side', category: 'landscape', ratio: '16:9', output: [1600, 900], columns: 3, rows: 2, areas: [['a', 'a', 'b'], ['a', 'a', 'c']] },
  { id: 'cinematic-3', name: 'Cinematic 3 Panel', category: 'landscape', ratio: '2.4:1', output: [1920, 800], columns: 3, rows: 1, areas: [['a', 'b', 'c']] },
  { id: 'editorial-landscape', name: 'Editorial Landscape', category: 'landscape', ratio: '16:9', output: [1600, 900], columns: 3, rows: 2, areas: [['a', 'b', 'b'], ['c', 'd', 'b']] },
  { id: 'polaroid-1', name: 'Single Polaroid', category: 'print', ratio: '5:6', output: [1000, 1200], columns: 1, rows: 1, areas: [['a']] },
  { id: 'polaroid-2', name: 'Double Polaroid', category: 'print', ratio: '1:1.2', output: [1000, 1200], columns: 1, rows: 2, areas: [['a'], ['b']] },
  { id: 'polaroid-4', name: 'Four Polaroid', category: 'print', ratio: '1:1', output: [1200, 1200], columns: 2, rows: 2, areas: [['a', 'b'], ['c', 'd']] },
  { id: 'print-strip-2x2', name: 'Photo Strip 2×2', category: 'print', ratio: '1:1', output: [1200, 1200], columns: 2, rows: 2, areas: [['a', 'b'], ['c', 'd']] },
  { id: 'print-strip-2x3', name: 'Photo Strip 2×3', category: 'print', ratio: '2:3', output: [1000, 1500], columns: 2, rows: 3, areas: [['a', 'b'], ['c', 'd'], ['e', 'f']] },
  { id: 'contact-3x3', name: 'Contact Sheet 3×3', category: 'print', ratio: '1:1', output: [1200, 1200], columns: 3, rows: 3, areas: [['a', 'b', 'c'], ['d', 'e', 'f'], ['g', 'h', 'i']] },
] as const

export function getGridPreset(id: string): GridPreset {
  return GRID_PRESETS.find((preset) => preset.id === id) ?? GRID_PRESETS[2]
}
