import { type ChainConfig, ensureMetaMaskChain } from '@/lib/chains'
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
  assetId?: string
  redeem?: boolean
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

export class TokenGatewayService {
  private queryClient: IndexerQueryClient

  constructor(indexerUrl: string) {
    this.queryClient = createQueryClient({ url: indexerUrl })
  }

  async teleport(
    params: TeleportParams,
    onProgress?: (progress: TransferProgress) => void
  ): Promise<TeleportResult> {
    const { sourceChain, destChain, recipient, amount, timeout = 3600 } = params

    // Validate chains have gateway addresses
    if (sourceChain.type === 'evm' && !sourceChain.gatewayAddress) {
      throw new Error(`Gateway address not configured for ${sourceChain.name}`)
    }

    onProgress?.({ status: 'signing' })

    try {
      // For EVM source chains, use viem
      if (sourceChain.type === 'evm') {
        return await this.teleportFromEvm(params, onProgress)
      }

      // For Substrate source chains, use Polkadot.js
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
    const { sourceChain, destChain, recipient, amount, timeout = 3600 } = params

    await ensureMetaMaskChain(sourceChain)

    const { createPublicClient, createWalletClient, custom, http, keccak256, toHex } = await import('viem')

    if (typeof window === 'undefined' || !window.ethereum) {
      throw new Error('No wallet detected. Please install MetaMask or another Web3 wallet.')
    }

    const chain = {
      id: sourceChain.chainId!,
      name: sourceChain.name,
      nativeCurrency: {
        name: sourceChain.tokenSymbol,
        symbol: sourceChain.tokenSymbol,
        decimals: sourceChain.tokenDecimals,
      },
      rpcUrls: { default: { http: [sourceChain.rpcUrl] } },
    }

    const publicClient = createPublicClient({ transport: http(sourceChain.rpcUrl) })
    const walletClient = createWalletClient({ transport: custom(window.ethereum) })

    const [account] = await walletClient.requestAddresses()
    if (!account) throw new Error('No account connected')

    if (!sourceChain.feeTokenAddress) {
      throw new Error(`Fee token address not configured for ${sourceChain.name}`)
    }

    const gatewayAddress = sourceChain.gatewayAddress as `0x${string}`
    const feeTokenAddress = sourceChain.feeTokenAddress as `0x${string}`
    const assetId = keccak256(toHex('WETH'))

    // Look up the WETH address registered on the gateway
    const wethAddress = await publicClient.readContract({
      address: gatewayAddress,
      abi: TOKEN_GATEWAY_ABI,
      functionName: 'erc20',
      args: [assetId],
    })

    if (wethAddress === '0x0000000000000000000000000000000000000000') {
      throw new Error('WETH not registered on the TokenGateway')
    }

    console.log('[teleport] WETH address:', wethAddress)
    console.log('[teleport] wrapping', amount.toString(), 'wei to WETH')

    // Step 1: Wrap ETH → WETH
    onProgress?.({ status: 'signing' })
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
      throw new Error(`WETH wrap reverted (${wrapHash})`)
    }

    // Step 2: Approve gateway to spend WETH
    console.log('[teleport] approving gateway to spend WETH')
    const approveWethHash = await walletClient.writeContract({
      account,
      address: wethAddress,
      abi: ERC20_APPROVE_ABI,
      functionName: 'approve',
      args: [gatewayAddress, amount],
      chain,
    })

    console.log('[teleport] WETH approve tx:', approveWethHash)
    const approveWethReceipt = await publicClient.waitForTransactionReceipt({
      hash: approveWethHash,
      timeout: 120_000,
    })
    if (approveWethReceipt.status === 'reverted') {
      throw new Error(`WETH approve reverted (${approveWethHash})`)
    }

    // Step 3: Approve gateway to spend fee token (dispatch fee)
    const feeApproveAmount = BigInt(10e18)
    console.log('[teleport] approving gateway to spend fee token:', feeTokenAddress)
    const approveUsdhHash = await walletClient.writeContract({
      account,
      address: feeTokenAddress,
      abi: ERC20_APPROVE_ABI,
      functionName: 'approve',
      args: [gatewayAddress, feeApproveAmount],
      chain,
    })

    console.log('[teleport] fee token approve tx:', approveUsdhHash)
    const approveUsdhReceipt = await publicClient.waitForTransactionReceipt({
      hash: approveUsdhHash,
      timeout: 120_000,
    })
    if (approveUsdhReceipt.status === 'reverted') {
      throw new Error(`Fee token approve reverted (${approveUsdhHash})`)
    }

    // Step 4: Teleport
    const destStateMachineId = this.encodeStateMachineId(destChain)
    const teleportParams = {
      amount,
      relayerFee: BigInt(1e18),
      assetId,
      redeem: params.redeem ?? false,
      to: this.encodeRecipientToBytes32(recipient),
      dest: destStateMachineId,
      timeout: BigInt(timeout),
      nativeCost: BigInt(0),
      data: '0x' as `0x${string}`,
    }

    console.log('[teleport] submitting teleport:', {
      gateway: gatewayAddress,
      dest: destStateMachineId,
      amount: amount.toString(),
      assetId,
    })

    const txHash = await walletClient.writeContract({
      account,
      address: gatewayAddress,
      abi: TOKEN_GATEWAY_ABI,
      functionName: 'teleport',
      args: [teleportParams],
      value: BigInt(0),
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

    // Extract commitment hash from the PostRequestEvent in the receipt
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

    // Dynamic import Polkadot.js
    const { ApiPromise, WsProvider } = await import('@polkadot/api')
    const { web3Enable, web3Accounts, web3FromAddress } = await import('@polkadot/extension-dapp')

    // Connect to chain
    const wsProvider = new WsProvider(sourceChain.rpcUrl)
    const api = await ApiPromise.create({ provider: wsProvider })

    // Enable extension and get accounts
    await web3Enable('Plata Mia')
    const accounts = await web3Accounts()

    if (accounts.length === 0) {
      throw new Error('No Polkadot accounts found. Please connect a wallet.')
    }

    const account = accounts[0]
    const injector = await web3FromAddress(account.address)

    // Encode destination
    const destChainType = destChain.type === 'evm' ? 'Ethereum' : 'Substrate'
    const destChainId = destChain.type === 'evm' ? destChain.chainId : 0

    onProgress?.({ status: 'signing' })

    // Check if tokenGateway pallet exists
    if (!api.tx.tokenGateway) {
      throw new Error('Token Gateway pallet not available on this chain')
    }

    // Create teleport extrinsic
    const tx = api.tx.tokenGateway.teleport(
      null, // assetId - null for native token
      { [destChainType]: destChainId },
      destChain.gatewayAddress || '0x',
      recipient,
      amount.toString(),
      timeout,
      0, // relayerFee
    )

    onProgress?.({ status: 'source_submitted' })

    // Sign and submit
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

  private encodeStateMachineId(chain: ChainConfig): `0x${string}` {
    // Hyperbridge state machine IDs are UTF-8 strings: "EVM-{chainId}", "POLKADOT-{paraId}"
    const id = chain.type === 'evm'
      ? `EVM-${chain.chainId || 1}`
      : `POLKADOT-${chain.ss58Prefix || 0}`
    const bytes = Array.from(new TextEncoder().encode(id))
    return `0x${bytes.map(b => b.toString(16).padStart(2, '0')).join('')}` as `0x${string}`
  }

  private encodeRecipientToBytes32(address: string): `0x${string}` {
    const clean = address.startsWith('0x') ? address.slice(2) : address
    return `0x${clean.padStart(64, '0')}` as `0x${string}`
  }
}

// Singleton instance
let gatewayService: TokenGatewayService | null = null

export function getTokenGatewayService(indexerUrl?: string): TokenGatewayService {
  if (!gatewayService) {
    const url = indexerUrl || process.env.NEXT_PUBLIC_HYPERBRIDGE_INDEXER || 'https://gargantua.indexer.polytope.technology'
    gatewayService = new TokenGatewayService(url)
  }
  return gatewayService
}

