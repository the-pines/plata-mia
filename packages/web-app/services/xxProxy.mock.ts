// Mock xx-proxy service - stores announcements in memory
// Replace with real xx-proxy API calls when backend is ready

export interface Announcement {
  R: string          // Ephemeral pubkey (hex)
  viewTag: number    // 0-255
  blockHint: number  // Block number hint
  timestamp: number  // When received
}

// In-memory storage (resets on page refresh)
let announcements: Announcement[] = []

export async function publishAnnouncement(
  R: string,
  viewTag: number,
  blockHint: number
): Promise<{ success: boolean; timestamp: number }> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 100))

  const announcement: Announcement = {
    R,
    viewTag,
    blockHint,
    timestamp: Date.now(),
  }

  announcements.push(announcement)
  console.log('[xx-proxy mock] Published announcement:', announcement)

  return { success: true, timestamp: announcement.timestamp }
}

export async function getAnnouncements(since: number = 0): Promise<Announcement[]> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 50))

  const filtered = announcements.filter(a => a.timestamp >= since)
  console.log(`[xx-proxy mock] Fetched ${filtered.length} announcements since ${since}`)

  return filtered
}

export async function clearAnnouncements(): Promise<void> {
  announcements = []
  console.log('[xx-proxy mock] Cleared all announcements')
}

// For debugging
export function getAllAnnouncements(): Announcement[] {
  return [...announcements]
}
