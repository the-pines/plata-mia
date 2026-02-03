'use client'

import { isDevMode } from '@/services/registry'

export function DevModeBadge() {
  if (!isDevMode()) return null

  return (
    <span className="text-xs bg-yellow-500 text-black px-2 py-1 rounded font-medium">
      DEV MODE
    </span>
  )
}
