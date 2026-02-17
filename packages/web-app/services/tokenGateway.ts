import { type ChainConfig, ensureMetaMaskChain } from '@/lib/chains'

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
}

export interface TeleportParams {
  sourceChain: ChainConfig
  destChain: ChainConfig
  recipient: string
  amount: bigint
  assetId?: string
  timeout?: number
}

export interface TeleportResult {
  txHash: string
  requestId: string
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

// USD.h fee token on Sepolia (ERC6160 HyperFungibleToken)
const USDH_ADDRESS = '0xa801da100bf16d07f668f4a49e1f71fc54d05177' as const

export class TokenGatewayService {
  private indexerUrl: string

  constructor(indexerUrl: string) {
    this.indexerUrl = indexerUrl
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

    const gatewayAddress = sourceChain.gatewayAddress as `0x${string}`
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

    // Step 3: Approve gateway to spend USD.h (dispatch fee token)
    const usdhApproveAmount = BigInt(10e18) // 10 USD.h — covers many teleports
    console.log('[teleport] approving gateway to spend USD.h for fees')
    const approveUsdhHash = await walletClient.writeContract({
      account,
      address: USDH_ADDRESS,
      abi: ERC20_APPROVE_ABI,
      functionName: 'approve',
      args: [gatewayAddress, usdhApproveAmount],
      chain,
    })

    console.log('[teleport] USD.h approve tx:', approveUsdhHash)
    const approveUsdhReceipt = await publicClient.waitForTransactionReceipt({
      hash: approveUsdhHash,
      timeout: 120_000,
    })
    if (approveUsdhReceipt.status === 'reverted') {
      throw new Error(`USD.h approve reverted (${approveUsdhHash})`)
    }

    // Step 4: Teleport
    const destStateMachineId = this.encodeStateMachineId(destChain)
    const teleportParams = {
      amount,
      relayerFee: BigInt(0),
      assetId,
      redeem: false,
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

    return { txHash, requestId: txHash }
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

  async getTransferStatus(requestId: string): Promise<TransferProgress> {
    try {
      const response = await fetch(this.indexerUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `
            query GetRequestStatus($id: String!) {
              request(id: $id) {
                id
                status
                source
                dest
                statusMetadata(first: 10, orderBy: [TIMESTAMP_DESC]) {
                  nodes {
                    status
                    blockNumber
                    transactionHash
                  }
                }
              }
            }
          `,
          variables: { id: requestId },
        }),
      })

      const data = await response.json()
      const request = data?.data?.request

      if (!request) {
        return { status: 'pending', requestId }
      }

      const statusMap: Record<string, TransferStatus> = {
        SOURCE: 'source_finalized',
        HYPERBRIDGE_DELIVERED: 'hyperbridge_relaying',
        DESTINATION: 'dest_finalized',
        HYPERBRIDGE_TIMED_OUT: 'timeout',
        TIMED_OUT: 'timeout',
      }

      const metadata = request.statusMetadata?.nodes || []
      const sourceEvent = metadata.find((m: { status: string }) => m.status === 'SOURCE')
      const destEvent = metadata.find((m: { status: string }) => m.status === 'DESTINATION')

      return {
        status: statusMap[request.status] || 'pending',
        requestId,
        sourceBlockNumber: sourceEvent?.blockNumber ? Number(sourceEvent.blockNumber) : undefined,
        destBlockNumber: destEvent?.blockNumber ? Number(destEvent.blockNumber) : undefined,
      }
    } catch (error) {
      return {
        status: 'pending',
        requestId,
        error: error instanceof Error ? error.message : 'Failed to fetch status',
      }
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

