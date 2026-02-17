import { create } from 'zustand'
import { type KeyPair } from '@plata-mia/stealth-core'

type Step = 'generate' | 'register' | 'done'

interface RegisterState {
  step: Step
  spending: KeyPair | null
  viewing: KeyPair | null
  hint: string
  nickname: string
  loading: boolean
  storing: boolean
  keysSaved: boolean
  savePassword: string
}

interface RegisterActions {
  setHint: (hint: string) => void
  setNickname: (nickname: string) => void
  setSavePassword: (password: string) => void
  setKeys: (spending: KeyPair, viewing: KeyPair) => void
  setStoring: (storing: boolean) => void
  setKeysSaved: (saved: boolean) => void
  setLoading: (loading: boolean) => void
  complete: () => void
  reset: () => void
}

const initialState: RegisterState = {
  step: 'generate',
  spending: null,
  viewing: null,
  hint: '',
  nickname: '',
  loading: false,
  storing: false,
  keysSaved: false,
  savePassword: '',
}

export const useRegisterStore = create<RegisterState & RegisterActions>()((set) => ({
  ...initialState,

  setHint: (hint) => set({ hint }),
  setNickname: (nickname) => set({ nickname }),
  setSavePassword: (password) => set({ savePassword: password }),
  setKeys: (spending, viewing) => set({ spending, viewing, step: 'register' }),
  setStoring: (storing) => set({ storing }),
  setKeysSaved: (saved) => set({ keysSaved: saved }),
  setLoading: (loading) => set({ loading }),
  complete: () => set({ step: 'done', loading: false }),
  reset: () => set(initialState),
}))
