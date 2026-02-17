import { useMutation, useQueryClient } from '@tanstack/react-query'
import { registerWithMetaMask, registerWithPolkadotJs } from '@/services/registry'
import type { ApiPromise } from '@polkadot/api'
import type { Signer } from '@polkadot/api/types'

export const registryKeys = {
  lookup: (hint: string) => ['registry', 'lookup', hint] as const,
  owner: (hint: string) => ['registry', 'owner', hint] as const,
}

interface RegisterMetaMaskParams {
  hint: string
  spendingKey: string
  viewingKey: string
  preferredChain: number
  nickname: string
  account: `0x${string}`
}

export function useRegisterMetaMask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (params: RegisterMetaMaskParams) =>
      registerWithMetaMask(
        params.hint,
        params.spendingKey,
        params.viewingKey,
        params.preferredChain,
        params.nickname,
        params.account
      ),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: registryKeys.lookup(variables.hint) })
      queryClient.invalidateQueries({ queryKey: registryKeys.owner(variables.hint) })
    },
  })
}

interface RegisterPolkadotJsParams {
  hint: string
  spendingKey: string
  viewingKey: string
  preferredChain: number
  nickname: string
  api: ApiPromise
  signerAddress: string
  signer: Signer
}

export function useRegisterPolkadotJs() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (params: RegisterPolkadotJsParams) =>
      registerWithPolkadotJs(
        params.hint,
        params.spendingKey,
        params.viewingKey,
        params.preferredChain,
        params.nickname,
        params.api,
        params.signerAddress,
        params.signer
      ),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: registryKeys.lookup(variables.hint) })
      queryClient.invalidateQueries({ queryKey: registryKeys.owner(variables.hint) })
    },
  })
}
