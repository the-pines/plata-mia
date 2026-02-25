import {
  type ChainConfig,
  type TokenConfig,
  isNativeToken,
  ensureMetaMaskChain,
  getHyperbridgeIndexerUrl,
} from '@/lib/config'
import { createQueryClient, queryPostRequest, type PostRequestWithStatus, type IndexerQueryClient } from '@hyperbridge/sdk'

export type TransferStatus =
  | 'pending'
  | 'signing'
  | 'source_submitted'
  | 'source_finalized'
  | 'hyperbridge_relaying'
  | 'dest_finalized'
  | 'completed'
  | 'failed'
  | 'timeout'

export interface TransferProgress {
  status: TransferStatus
  txHash?: string
  requestId?: string
  detail?: string
  error?: string
  sourceBlockNumber?: number
  destBlockNumber?: number
  destTxHash?: string
}

export interface TeleportParams {
  sourceChain: ChainConfig
  destChain: ChainConfig
  recipient: string
  amount: bigint
  token: TokenConfig
  timeout?: number
}

export interface TeleportResult {
  txHash: string
  requestId: string
  commitmentHash?: string
  sourceBlockNumber?: number
}

// Token Gateway ABI – verified against 0xFcDa26cA021d5535C3059547390E6cCd8De7acA6 (Sepolia)
const TOKEN_GATEWAY_ABI = [
  {
    name: 'teleport',
    type: 'function',
    inputs: [
      { name: 'teleportParams', type: 'tuple', components: [
        { name: 'amount', type: 'uint256' },
        { name: 'relayerFee', type: 'uint256' },
        { name: 'assetId', type: 'bytes32' },
        { name: 'redeem', type: 'bool' },
        { name: 'to', type: 'bytes32' },
        { name: 'dest', type: 'bytes' },
        { name: 'timeout', type: 'uint64' },
        { name: 'nativeCost', type: 'uint256' },
        { name: 'data', type: 'bytes' },
      ]}
    ],
    outputs: [{ name: 'commitment', type: 'bytes32' }],
    stateMutability: 'payable',
  },
  {
    name: 'erc20',
    type: 'function',
    inputs: [{ name: 'assetId', type: 'bytes32' }],
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
  },
  {
    name: 'erc6160',
    type: 'function',
    inputs: [{ name: 'assetId', type: 'bytes32' }],
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
  },
] as const

const WETH9_ABI = [
  {
    name: 'deposit',
    type: 'function',
    inputs: [],
    outputs: [],
    stateMutability: 'payable',
  },
] as const

const ERC20_APPROVE_ABI = [
  {
    name: 'approve',
    type: 'function',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
  },
] as const

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

export interface TokenAvailability {
  available: boolean
  reason?: string
}

export class TokenGatewayService {
  private queryClient: IndexerQueryClient

  constructor(indexerUrl: string) {
    this.queryClient = createQueryClient({ url: indexerUrl })
  }

  async checkTokensAvailability(
    sourceChain: ChainConfig,
    destChain: ChainConfig,
    tokens: TokenConfig[]
  ): Promise<Record<string, TokenAvailability>> {
    const result: Record<string, TokenAvailability> = {}

    if (!sourceChain.gateway || !destChain.gateway) {
      for (const token of tokens) {
        result[token.symbol] = { available: false, reason: 'No bridge on this route' }
      }
      return result
    }

    const bridgeable = tokens.filter((t) => t.assetId)
    for (const token of tokens) {
      if (!token.assetId) {
        result[token.symbol] = { available: false, reason: 'Not bridgeable' }
      }
    }

    if (bridgeable.length === 0) return result

    try {
      const { createPublicClient, http, keccak256, toHex } = await import('viem')

      const sourceClient = createPublicClient({ transport: http(sourceChain.rpcUrl) })
      const destClient = createPublicClient({ transport: http(destChain.rpcUrl) })

      const checks = bridgeable.map(async (token) => {
        const assetIdHash = keccak256(toHex(token.assetId!))
        try {
          const [srcErc20, srcHft, dstErc20, dstHft] = await Promise.all([
            sourceClient.readContract({ address: sourceChain.gateway!.address, abi: TOKEN_GATEWAY_ABI, functionName: 'erc20', args: [assetIdHash] }),
            sourceClient.readContract({ address: sourceChain.gateway!.address, abi: TOKEN_GATEWAY_ABI, functionName: 'erc6160', args: [assetIdHash] }),
            destClient.readContract({ address: destChain.gateway!.address, abi: TOKEN_GATEWAY_ABI, functionName: 'erc20', args: [assetIdHash] }),
            destClient.readContract({ address: destChain.gateway!.address, abi: TOKEN_GATEWAY_ABI, functionName: 'erc6160', args: [assetIdHash] }),
          ])

          const srcRegistered = srcErc20 !== ZERO_ADDRESS || srcHft !== ZERO_ADDRESS
          const dstRegistered = dstErc20 !== ZERO_ADDRESS || dstHft !== ZERO_ADDRESS

          if (!srcRegistered) {
            result[token.symbol] = { available: false, reason: `Not on ${sourceChain.name}` }
          } else if (!dstRegistered) {
            result[token.symbol] = { available: false, reason: `Not on ${destChain.name}` }
          } else {
            result[token.symbol] = { available: true }
          }
        } catch {
          result[token.symbol] = { available: false, reason: 'Failed to check availability' }
        }
      })

      await Promise.all(checks)
    } catch {
      for (const token of bridgeable) {
        if (!result[token.symbol]) {
          result[token.symbol] = { available: false, reason: 'Failed to check availability' }
        }
      }
    }

    return result
  }

  async teleport(
    params: TeleportParams,
    onProgress?: (progress: TransferProgress) => void
  ): Promise<TeleportResult> {
    const { sourceChain } = params

    if (sourceChain.type === 'evm' && !sourceChain.gateway) {
      throw new Error(`Gateway not configured for ${sourceChain.name}`)
    }

    onProgress?.({ status: 'signing' })

    try {
      if (sourceChain.type === 'evm') {
        return await this.teleportFromEvm(params, onProgress)
      }

      if (sourceChain.type === 'substrate') {
        return await this.teleportFromSubstrate(params, onProgress)
      }

      throw new Error(`Unsupported source chain type: ${sourceChain.type}`)
    } catch (error) {
      onProgress?.({
        status: 'failed',
        error: error instanceof Error ? error.message : 'Transfer failed',
      })
      throw error
    }
  }

  private async teleportFromEvm(
    params: TeleportParams,
    onProgress?: (progress: TransferProgress) => void
  ): Promise<TeleportResult> {
    const { sourceChain, destChain, recipient, amount, token, timeout = 3600 } = params

    await ensureMetaMaskChain(sourceChain)

    const { createPublicClient, createWalletClient, custom, http, keccak256, toHex } = await import('viem')

    if (typeof window === 'undefined' || !window.ethereum) {
      throw new Error('No wallet detected. Please install MetaMask or another Web3 wallet.')
    }

    const chain = {
      id: sourceChain.chainId,
      name: sourceChain.name,
      nativeCurrency: sourceChain.nativeCurrency,
      rpcUrls: { default: { http: [sourceChain.rpcUrl] } },
    }

    const publicClient = createPublicClient({ transport: http(sourceChain.rpcUrl) })
    const walletClient = createWalletClient({ transport: custom(window.ethereum) })

    const [account] = await walletClient.requestAddresses()
    if (!account) throw new Error('No account connected')

    const gateway = sourceChain.gateway!
    if (!token.assetId) {
      throw new Error(`${token.symbol} is not bridgeable`)
    }
    const assetId = keccak256(toHex(token.assetId))

    if (isNativeToken(sourceChain.id, token.symbol)) {
      // Native token: wrap → approve → teleport
      const wethAddress = await publicClient.readContract({
        address: gateway.address,
        abi: TOKEN_GATEWAY_ABI,
        functionName: 'erc20',
        args: [assetId],
      })

      if (wethAddress === ZERO_ADDRESS) {
        throw new Error(`${token.assetId} not registered on ${sourceChain.name} gateway`)
      }

      console.log(`[teleport] ${token.assetId} address:`, wethAddress)
      console.log('[teleport] wrapping', amount.toString(), 'wei')

      // Step 1: Wrap native → WETH
      onProgress?.({ status: 'signing', detail: `Signing ${token.assetId} Wrap` })
      const wrapHash = await walletClient.writeContract({
        account,
        address: wethAddress,
        abi: WETH9_ABI,
        functionName: 'deposit',
        args: [],
        value: amount,
        chain,
      })

      console.log('[teleport] wrap tx:', wrapHash)
      const wrapReceipt = await publicClient.waitForTransactionReceipt({
        hash: wrapHash,
        timeout: 120_000,
      })
      if (wrapReceipt.status === 'reverted') {
        throw new Error(`${token.assetId} wrap reverted (${wrapHash})`)
      }

      // Step 2: Approve gateway to spend WETH
      onProgress?.({ status: 'signing', detail: `Signing ${token.assetId} Approval` })
      console.log(`[teleport] approving gateway to spend ${token.assetId}`)
      const approveHash = await walletClient.writeContract({
        account,
        address: wethAddress,
        abi: ERC20_APPROVE_ABI,
        functionName: 'approve',
        args: [gateway.address, amount],
        chain,
      })

      console.log(`[teleport] ${token.assetId} approve tx:`, approveHash)
      const approveReceipt = await publicClient.waitForTransactionReceipt({
        hash: approveHash,
        timeout: 120_000,
      })
      if (approveReceipt.status === 'reverted') {
        throw new Error(`${token.assetId} approve reverted (${approveHash})`)
      }
    } else {
      // ERC20 token: resolve address from gateway, then approve → teleport
      const erc20Address = await publicClient.readContract({
        address: gateway.address,
        abi: TOKEN_GATEWAY_ABI,
        functionName: 'erc20',
        args: [assetId],
      })

      if (erc20Address === ZERO_ADDRESS) {
        throw new Error(`${token.symbol} not registered on ${sourceChain.name} gateway`)
      }

      onProgress?.({ status: 'signing', detail: `Signing ${token.symbol} Approval` })
      console.log(`[teleport] ${token.symbol} address:`, erc20Address)
      console.log(`[teleport] approving gateway to spend ${token.symbol}`)
      const approveHash = await walletClient.writeContract({
        account,
        address: erc20Address,
        abi: ERC20_APPROVE_ABI,
        functionName: 'approve',
        args: [gateway.address, amount],
        chain,
      })

      console.log(`[teleport] ${token.symbol} approve tx:`, approveHash)
      const approveReceipt = await publicClient.waitForTransactionReceipt({
        hash: approveHash,
        timeout: 120_000,
      })
      if (approveReceipt.status === 'reverted') {
        throw new Error(`${token.symbol} approve reverted (${approveHash})`)
      }
    }

    // Approve gateway to spend fee token (Hyperbridge dispatch fee)
    onProgress?.({ status: 'signing', detail: 'Signing Fee Approval' })
    const feeApproveAmount = 10n * 10n ** 18n // 10 fee tokens — headroom over the 1-token relayer fee
    console.log('[teleport] approving gateway to spend fee token:', gateway.feeTokenAddress)
    const approveFeeHash = await walletClient.writeContract({
      account,
      address: gateway.feeTokenAddress,
      abi: ERC20_APPROVE_ABI,
      functionName: 'approve',
      args: [gateway.address, feeApproveAmount],
      chain,
    })

    console.log('[teleport] fee token approve tx:', approveFeeHash)
    const approveFeeReceipt = await publicClient.waitForTransactionReceipt({
      hash: approveFeeHash,
      timeout: 120_000,
    })
    if (approveFeeReceipt.status === 'reverted') {
      throw new Error(`Fee token approve reverted (${approveFeeHash})`)
    }

    // Teleport
    onProgress?.({ status: 'signing', detail: 'Signing Teleport' })
    const destStateMachineId = this.encodeStateMachineIdHex(destChain.gateway!.stateMachineId)
    const teleportParams = {
      amount,
      relayerFee: 10n ** 18n, // 1 fee token
      assetId,
      redeem: false,
      to: this.encodeRecipientToBytes32(recipient),
      dest: destStateMachineId,
      timeout: BigInt(timeout),
      nativeCost: 0n,
      data: '0x' as `0x${string}`,
    }

    console.log('[teleport] submitting teleport:', {
      gateway: gateway.address,
      dest: destStateMachineId,
      amount: amount.toString(),
      assetId,
    })

    const txHash = await walletClient.writeContract({
      account,
      address: gateway.address,
      abi: TOKEN_GATEWAY_ABI,
      functionName: 'teleport',
      args: [teleportParams],
      value: 0n,
      gas: 10_000_000n,
      chain,
    })

    console.log('[teleport] teleport tx:', txHash)
    onProgress?.({ status: 'source_submitted', txHash })

    const receipt = await publicClient.waitForTransactionReceipt({
      hash: txHash,
      timeout: 120_000,
    })

    if (receipt.status === 'reverted') {
      console.error('[teleport] tx reverted:', txHash)
      throw new Error(`Teleport reverted on-chain (${txHash})`)
    }

    console.log('[teleport] confirmed, block:', Number(receipt.blockNumber))
    onProgress?.({
      status: 'source_finalized',
      txHash,
      sourceBlockNumber: Number(receipt.blockNumber),
    })

    const sourceBlockNumber = Number(receipt.blockNumber)
    let commitmentHash: string | undefined
    try {
      const { getPostRequestEventFromTx, postRequestCommitment } = await import('@hyperbridge/sdk')
      const event = await getPostRequestEventFromTx(publicClient, txHash)
      if (event?.args) {
        const { commitment } = postRequestCommitment(event.args)
        commitmentHash = commitment
        console.log('[teleport] commitment hash:', commitmentHash)
      } else {
        console.error('[teleport] PostRequestEvent not found in tx receipt — status polling will not work')
      }
    } catch (err) {
      console.error('[teleport] failed to extract commitment — status polling will not work:', err)
    }

    return { txHash, requestId: commitmentHash || txHash, commitmentHash, sourceBlockNumber }
  }

  private async teleportFromSubstrate(
    params: TeleportParams,
    onProgress?: (progress: TransferProgress) => void
  ): Promise<TeleportResult> {
    const { sourceChain, destChain, recipient, amount, timeout = 3600 } = params

    const { ApiPromise, WsProvider } = await import('@polkadot/api')
    const { web3Enable, web3Accounts, web3FromAddress } = await import('@polkadot/extension-dapp')

    const wsProvider = new WsProvider(sourceChain.rpcUrl)
    const api = await ApiPromise.create({ provider: wsProvider })

    await web3Enable('Plata Mia')
    const accounts = await web3Accounts()

    if (accounts.length === 0) {
      throw new Error('No Polkadot accounts found. Please connect a wallet.')
    }

    const account = accounts[0]
    const injector = await web3FromAddress(account.address)

    const destChainType = destChain.type === 'evm' ? 'Ethereum' : 'Substrate'
    const destChainId = destChain.type === 'evm' ? destChain.chainId : 0

    onProgress?.({ status: 'signing' })

    if (!api.tx.tokenGateway) {
      throw new Error('Token Gateway pallet not available on this chain')
    }

    const tx = api.tx.tokenGateway.teleport(
      null,
      { [destChainType]: destChainId },
      destChain.gateway?.address || '0x',
      recipient,
      amount.toString(),
      timeout,
      0,
    )

    onProgress?.({ status: 'source_submitted' })

    const txHash = await new Promise<string>((resolve, reject) => {
      tx.signAndSend(
        account.address,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { signer: injector.signer as any },
        (result) => {
          if (result.status.isInBlock) {
            onProgress?.({
              status: 'source_finalized',
              txHash: result.txHash.toHex(),
              sourceBlockNumber: undefined,
            })
          }
          if (result.status.isFinalized) {
            resolve(result.txHash.toHex())
          }
          if (result.isError) {
            reject(new Error('Transaction failed'))
          }
        }
      ).catch(reject)
    })

    await api.disconnect()

    return { txHash, requestId: txHash }
  }

  async queryStatus(commitmentHash: string): Promise<TransferProgress> {
    try {
      const result = await queryPostRequest({
        commitmentHash,
        queryClient: this.queryClient,
      })

      if (!result) {
        return { status: 'pending', requestId: commitmentHash }
      }

      return this.mapPostRequestToProgress(result, commitmentHash)
    } catch (error) {
      return {
        status: 'pending',
        requestId: commitmentHash,
        error: error instanceof Error ? error.message : 'Failed to fetch status',
      }
    }
  }

  private mapPostRequestToProgress(
    result: PostRequestWithStatus,
    commitmentHash: string
  ): TransferProgress {
    const statusMap: Record<string, TransferStatus> = {
      SOURCE: 'source_finalized',
      SOURCE_FINALIZED: 'source_finalized',
      HYPERBRIDGE_DELIVERED: 'hyperbridge_relaying',
      HYPERBRIDGE_FINALIZED: 'hyperbridge_relaying',
      DESTINATION: 'dest_finalized',
      TIMED_OUT: 'timeout',
      HYPERBRIDGE_TIMED_OUT: 'timeout',
    }

    const statuses = result.statuses ?? []
    const lastStatus = statuses[statuses.length - 1]
    const mapped = lastStatus ? statusMap[lastStatus.status] ?? 'pending' : 'pending'

    const sourceEvent = statuses.find((s) => s.status === 'SOURCE')
    const destEvent = statuses.find((s) => s.status === 'DESTINATION')

    return {
      status: mapped,
      requestId: commitmentHash,
      sourceBlockNumber: sourceEvent?.metadata?.blockNumber,
      destBlockNumber: destEvent?.metadata?.blockNumber,
      destTxHash: destEvent?.metadata?.transactionHash,
    }
  }

  private encodeStateMachineIdHex(stateMachineId: string): `0x${string}` {
    const bytes = Array.from(new TextEncoder().encode(stateMachineId))
    return `0x${bytes.map(b => b.toString(16).padStart(2, '0')).join('')}` as `0x${string}`
  }

  private encodeRecipientToBytes32(address: string): `0x${string}` {
    const clean = address.startsWith('0x') ? address.slice(2) : address
    return `0x${clean.padStart(64, '0')}` as `0x${string}`
  }
}

let gatewayService: TokenGatewayService | null = null

export function getTokenGatewayService(): TokenGatewayService {
  if (!gatewayService) {
    gatewayService = new TokenGatewayService(getHyperbridgeIndexerUrl())
  }
  return gatewayService
}
