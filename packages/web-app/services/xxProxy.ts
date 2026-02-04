import { XX_PROXY_URL } from '@/lib/constants'

export interface Announcement {
  R: string
  viewTag: number
  blockHint: number
  timestamp: number
}

export async function publishAnnouncement(
  R: string,
  viewTag: number,
  blockHint: number
): Promise<{ success: boolean; timestamp: number }> {
  const response = await fetch(`${XX_PROXY_URL}/announce`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ r: R, viewTag, blockHint }),
  })

  const data = await response.json()
  return { success: data.success, timestamp: Date.now() }
}

export async function getAnnouncements(since: number = 0): Promise<Announcement[]> {
  const response = await fetch(`${XX_PROXY_URL}/announcements?since=${since}`)
  const data = await response.json()

  return data.announcements.map((a: { r: string; viewTag: number; blockHint: number; receivedAt: number }) => ({
    R: a.r,
    viewTag: a.viewTag,
    blockHint: a.blockHint,
    timestamp: a.receivedAt,
  }))
}
