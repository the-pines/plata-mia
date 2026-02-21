import { create } from 'zustand'
import { type HistoryEntry, type HistoryStatus, TERMINAL_STATUSES } from '@/types/history'

interface HistoryState {
  entries: HistoryEntry[]
  walletAddress: string | null
}

interface HistoryActions {
  loadForWallet: (address: string) => void
  addEntry: (entry: HistoryEntry) => void
  updateStatus: (id: string, status: HistoryStatus, extra?: Partial<HistoryEntry>) => void
  removeEntry: (id: string) => void
  clearAll: () => void
}

function storageKey(address: string): string {
  return `plata-mia:history:${address.toLowerCase()}`
}

function readFromStorage(address: string): HistoryEntry[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(storageKey(address))
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function writeToStorage(address: string, entries: HistoryEntry[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(storageKey(address), JSON.stringify(entries))
}

export const useHistoryStore = create<HistoryState & HistoryActions>()((set, get) => ({
  entries: [],
  walletAddress: null,

  loadForWallet: (address) => {
    const entries = readFromStorage(address)
    set({ entries, walletAddress: address })
  },

  addEntry: (entry) => {
    const { walletAddress } = get()
    if (!walletAddress) return

    const entries = [entry, ...get().entries]
    writeToStorage(walletAddress, entries)
    set({ entries })
  },

  updateStatus: (id, status, extra) => {
    const { entries, walletAddress } = get()
    if (!walletAddress) return

    const updated = entries.map((e) =>
      e.id === id ? { ...e, ...extra, status, lastChecked: Date.now() } : e
    )
    writeToStorage(walletAddress, updated)
    set({ entries: updated })
  },

  removeEntry: (id) => {
    const { entries, walletAddress } = get()
    if (!walletAddress) return

    const filtered = entries.filter((e) => e.id !== id)
    writeToStorage(walletAddress, filtered)
    set({ entries: filtered })
  },

  clearAll: () => {
    const { walletAddress } = get()
    if (!walletAddress) return

    writeToStorage(walletAddress, [])
    set({ entries: [] })
  },
}))

export function getPendingCount(entries: HistoryEntry[]): number {
  return entries.filter((e) => !TERMINAL_STATUSES.includes(e.status)).length
}
