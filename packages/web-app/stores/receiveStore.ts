import { create } from 'zustand'

interface ReceiveState {
  viewingSecret: string
  spendingSecret: string
  spendingPubkey: string
  hasKeys: boolean
  keysLoaded: boolean
  showKeys: boolean
  unlocking: boolean
  unlockPassword: string
  loading: boolean
  scannedCount: number
  payments: FoundPayment[]
}

export interface FoundPayment {
  announcement: { R: string; viewTag: number; blockHint: number; timestamp: number }
  scanResult: { address: string }
  derivedKey: string
}

interface ReceiveActions {
  setViewingSecret: (secret: string) => void
  setSpendingSecret: (secret: string) => void
  setSpendingPubkey: (pubkey: string) => void
  setUnlockPassword: (password: string) => void
  setHasKeys: (hasKeys: boolean) => void
  setShowKeys: (showKeys: boolean) => void
  loadKeysFromStorage: (keys: {
    viewingSecret: string
    spendingSecret: string
    spendingPubkey: string
  }) => void
  setUnlocking: (unlocking: boolean) => void
  startScan: () => void
  completeScan: (scannedCount: number, payments: FoundPayment[]) => void
  failScan: () => void
  reset: () => void
}

const initialState: ReceiveState = {
  viewingSecret: '',
  spendingSecret: '',
  spendingPubkey: '',
  hasKeys: false,
  keysLoaded: false,
  showKeys: true,
  unlocking: false,
  unlockPassword: '',
  loading: false,
  scannedCount: 0,
  payments: [],
}

export const useReceiveStore = create<ReceiveState & ReceiveActions>()((set) => ({
  ...initialState,

  setViewingSecret: (secret) => set({ viewingSecret: secret }),
  setSpendingSecret: (secret) => set({ spendingSecret: secret }),
  setSpendingPubkey: (pubkey) => set({ spendingPubkey: pubkey }),
  setUnlockPassword: (password) => set({ unlockPassword: password }),
  setHasKeys: (hasKeys) => set({ hasKeys }),
  setShowKeys: (showKeys) => set({ showKeys }),
  loadKeysFromStorage: (keys) =>
    set({
      viewingSecret: keys.viewingSecret,
      spendingSecret: keys.spendingSecret,
      spendingPubkey: keys.spendingPubkey,
      keysLoaded: true,
    }),
  setUnlocking: (unlocking) => set({ unlocking }),
  startScan: () => set({ loading: true, payments: [], scannedCount: 0 }),
  completeScan: (scannedCount, payments) => set({ scannedCount, payments, loading: false }),
  failScan: () => set({ loading: false }),
  reset: () => set(initialState),
}))
