import { create } from 'zustand'
import { type KeyPair } from '@plata-mia/stealth-core'
import type { StealthMetaAddress } from '@/services/registry'

type Step = 'generate' | 'register' | 'done'

interface RegisterState {
  step: Step
  spending: KeyPair | null
  viewing: KeyPair | null
  hint: string
  loading: boolean
  storing: boolean
  keysSaved: boolean
  saveFailed: boolean
  savePassword: string
  showRawKeys: boolean
  loadingEntry: boolean
  existingEntry: StealthMetaAddress | null
  existingEntryHint: string | null
}

interface RegisterActions {
  setHint: (hint: string) => void
  setSavePassword: (password: string) => void
  setKeys: (spending: KeyPair, viewing: KeyPair) => void
  setStoring: (storing: boolean) => void
  setKeysSaved: (saved: boolean) => void
  setSaveFailed: (failed: boolean) => void
  setLoading: (loading: boolean) => void
  setShowRawKeys: (show: boolean) => void
  setLoadingEntry: (loading: boolean) => void
  setExistingEntry: (entry: StealthMetaAddress | null, hint: string | null) => void
  complete: () => void
  reset: () => void
}

const initialState: RegisterState = {
  step: 'generate',
  spending: null,
  viewing: null,
  hint: '',
  loading: false,
  storing: false,
  keysSaved: false,
  saveFailed: false,
  savePassword: '',
  showRawKeys: false,
  loadingEntry: false,
  existingEntry: null,
  existingEntryHint: null,
}

export const useRegisterStore = create<RegisterState & RegisterActions>()((set) => ({
  ...initialState,

  setHint: (hint) => set({ hint }),
  setSavePassword: (password) => set({ savePassword: password }),
  setKeys: (spending, viewing) => set({ spending, viewing, step: 'register' }),
  setStoring: (storing) => set({ storing }),
  setKeysSaved: (saved) => set({ keysSaved: saved }),
  setSaveFailed: (failed) => set({ saveFailed: failed }),
  setLoading: (loading) => set({ loading }),
  setShowRawKeys: (show) => set({ showRawKeys: show }),
  setLoadingEntry: (loading) => set({ loadingEntry: loading }),
  setExistingEntry: (entry, hint) => set({ existingEntry: entry, existingEntryHint: hint }),
  complete: () => set({ step: 'done', loading: false }),
  reset: () => set(initialState),
}))
