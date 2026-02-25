import { create } from 'zustand'
import { type StealthMetaAddress } from '@/services/registry'
import { type TransferProgress } from '@/services/tokenGateway'
import { type DerivedAddress } from '@plata-mia/stealth-core'
import { getDefaultChain, getNativeSymbol } from '@/lib/config'

type Step = 'lookup' | 'send' | 'transferring' | 'done'

interface SendState {
  step: Step
  hint: string
  recipient: StealthMetaAddress | null
  derivedAddress: DerivedAddress | null
  amount: string
  sourceChainId: string
  destChainId: string
  selectedTokenSymbol: string
  txHash: string
  transferProgress: TransferProgress | null
  loading: boolean
}

interface SendActions {
  setHint: (hint: string) => void
  setAmount: (amount: string) => void
  setSourceChainId: (id: string) => void
  setDestChainId: (id: string) => void
  setSelectedTokenSymbol: (symbol: string) => void
  setLookupResult: (recipient: StealthMetaAddress, derivedAddress: DerivedAddress) => void
  startTransfer: () => void
  updateProgress: (progress: TransferProgress) => void
  completeTransfer: (txHash: string) => void
  failTransfer: (error: string) => void
  setLoading: (loading: boolean) => void
  reset: () => void
}

const defaultChain = getDefaultChain()
const initialState: SendState = {
  step: 'lookup',
  hint: '',
  recipient: null,
  derivedAddress: null,
  amount: '',
  sourceChainId: defaultChain.id,
  destChainId: defaultChain.id,
  selectedTokenSymbol: getNativeSymbol(defaultChain.id) ?? '',
  txHash: '',
  transferProgress: null,
  loading: false,
}

export const useSendStore = create<SendState & SendActions>()((set) => ({
  ...initialState,

  setHint: (hint) => set({ hint }),
  setAmount: (amount) => set({ amount }),
  setSourceChainId: (id) => {
    set({ sourceChainId: id, selectedTokenSymbol: getNativeSymbol(id) ?? '' })
  },
  setDestChainId: (id) => set({ destChainId: id }),
  setSelectedTokenSymbol: (symbol) => set({ selectedTokenSymbol: symbol }),

  setLookupResult: (recipient, derivedAddress) =>
    set({ recipient, derivedAddress, step: 'send' }),

  startTransfer: () =>
    set({ step: 'transferring', loading: true, transferProgress: { status: 'pending' } }),

  updateProgress: (progress) => set({ transferProgress: progress }),

  completeTransfer: (txHash) =>
    set({
      txHash,
      transferProgress: { status: 'completed', txHash },
      step: 'done',
      loading: false,
    }),

  failTransfer: (error) =>
    set({ transferProgress: { status: 'failed', error }, loading: false }),

  setLoading: (loading) => set({ loading }),

  reset: () => set(initialState),
}))
