import {
  Activity,
  Briefcase,
  Building2,
  Dumbbell,
  HeartPulse,
  Sparkles,
  Stethoscope,
  Users,
  type LucideIcon,
} from 'lucide-react'

import type { TagProps } from '~/components/ui/tag'

type Palette = NonNullable<TagProps['category']>

const TAG_PALETTE: readonly Palette[] = [
  'blue',
  'purple',
  'pink',
  'orange',
  'yellow',
  'green',
  'red',
  'gray',
] as const

const ICON_SET: readonly LucideIcon[] = [
  Stethoscope,
  HeartPulse,
  Activity,
  Briefcase,
  Building2,
  Dumbbell,
  Users,
  Sparkles,
] as const

/**
 * Mapping of palette → literal Tailwind class strings. Using a Record (not
 * string interpolation) keeps the classes statically discoverable by Tailwind's
 * JIT compiler; otherwise the dynamic `bg-${palette}-light` form would be
 * stripped from the production build.
 */
const ICON_BLOCK_CLASS: Record<Palette, string> = {
  blue: 'bg-blue-light text-blue-dark',
  purple: 'bg-purple-light text-purple-dark',
  pink: 'bg-pink-light text-pink-dark',
  orange: 'bg-orange-light text-orange-dark',
  yellow: 'bg-yellow-light text-yellow-dark',
  green: 'bg-green-light text-green-dark',
  red: 'bg-red-light text-red-dark',
  gray: 'bg-gray-200 text-gray-700',
}

const BORDER_LEFT_CLASS: Record<Palette, string> = {
  blue: 'border-l-2 border-l-blue-500',
  purple: 'border-l-2 border-l-purple-500',
  pink: 'border-l-2 border-l-pink-500',
  orange: 'border-l-2 border-l-orange-500',
  yellow: 'border-l-2 border-l-yellow-500',
  green: 'border-l-2 border-l-green-500',
  red: 'border-l-2 border-l-red-500',
  gray: 'border-l-2 border-l-gray-400',
}

/** Tinted background + text + left accent for calendar chips and compact cards. */
const CHIP_CLASS: Record<Palette, string> = {
  blue: 'bg-blue-50 text-blue-900 border-l-[3px] border-l-blue-500',
  purple: 'bg-purple-50 text-purple-900 border-l-[3px] border-l-purple-500',
  pink: 'bg-pink-50 text-pink-900 border-l-[3px] border-l-pink-500',
  orange: 'bg-orange-50 text-orange-900 border-l-[3px] border-l-orange-500',
  yellow: 'bg-yellow-50 text-yellow-900 border-l-[3px] border-l-yellow-400',
  green: 'bg-green-50 text-green-900 border-l-[3px] border-l-green-500',
  red: 'bg-red-50 text-red-900 border-l-[3px] border-l-red-500',
  gray: 'bg-gray-100 text-gray-700 border-l-[3px] border-l-gray-400',
}

/** FNV-1a 32-bit hash — fast, deterministic, no deps. */
function fnv1a32(input: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return hash
}

export interface CategoryVisual {
  palette: Palette
  Icon: LucideIcon
  blockClass: string
  borderLeftClass: string
  chipClass: string
}

/**
 * Returns a deterministic palette + icon for a category id. Same id → same
 * visual on every render and across pages. Future iteration (F03) can add
 * editable per-category color/icon columns and override this fallback.
 */
export function categoryVisual(categoryId: string): CategoryVisual {
  const palette = TAG_PALETTE[fnv1a32(categoryId) % TAG_PALETTE.length]
  const Icon = ICON_SET[fnv1a32(categoryId + '_icon') % ICON_SET.length]
  return {
    palette,
    Icon,
    blockClass: ICON_BLOCK_CLASS[palette],
    borderLeftClass: BORDER_LEFT_CLASS[palette],
    chipClass: CHIP_CLASS[palette],
  }
}
