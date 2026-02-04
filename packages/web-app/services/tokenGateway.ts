import type { ChainConfig } from '@/lib/chains'

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

// Token Gateway ABI - minimal interface for teleport
const TOKEN_GATEWAY_ABI = [
  {
    name: 'teleport',
    type: 'function',
    inputs: [
      { name: 'params', type: 'tuple', components: [
        { name: 'assetId', type: 'bytes32' },
        { name: 'destination', type: 'bytes' },
        { name: 'recipient', type: 'bytes' },
        { name: 'amount', type: 'uint256' },
        { name: 'timeout', type: 'uint64' },
        { name: 'tokenGateway', type: 'bytes' },
        { name: 'relayerFee', type: 'uint256' },
        { name: 'redeem', type: 'bool' },
      ]}
    ],
    outputs: [{ name: 'commitment', type: 'bytes32' }],
    stateMutability: 'payable',
  },
  {
    name: 'quote',
    type: 'function',
    inputs: [
      { name: 'destination', type: 'bytes' },
      { name: 'timeout', type: 'uint64' },
    ],
    outputs: [{ name: 'fee', type: 'uint256' }],
    stateMutability: 'view',
  },
] as const

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

    // Dynamic import viem to avoid SSR issues
    const { createPublicClient, createWalletClient, custom, http, encodeFunctionData } = await import('viem')

    // Check if window.ethereum is available
    if (typeof window === 'undefined' || !window.ethereum) {
      throw new Error('No wallet detected. Please install MetaMask or another Web3 wallet.')
    }

    const publicClient = createPublicClient({
      transport: http(sourceChain.rpcUrl),
    })

    const walletClient = createWalletClient({
      transport: custom(window.ethereum),
    })

    // Request account access
    const [account] = await walletClient.requestAddresses()
    if (!account) {
      throw new Error('No account connected')
    }

    // Encode destination state machine ID
    const destStateMachineId = this.encodeStateMachineId(destChain)

    // Encode recipient address for destination chain
    const encodedRecipient = this.encodeRecipient(recipient, destChain)

    // Get destination gateway address
    const destGatewayAddress = destChain.gatewayAddress || '0x'

    // Prepare teleport parameters
    const teleportParams = {
      assetId: '0x' + '0'.repeat(64) as `0x${string}`, // Native token
      destination: destStateMachineId,
      recipient: encodedRecipient,
      amount,
      timeout: BigInt(timeout),
      tokenGateway: destGatewayAddress as `0x${string}`,
      relayerFee: BigInt(0), // Auto-relay
      redeem: false,
    }

    onProgress?.({ status: 'source_submitted' })

    // Execute teleport transaction
    const txHash = await walletClient.writeContract({
      account,
      address: sourceChain.gatewayAddress as `0x${string}`,
      abi: TOKEN_GATEWAY_ABI,
      functionName: 'teleport',
      args: [teleportParams],
      value: amount, // For native token transfers
      chain: {
        id: sourceChain.chainId!,
        name: sourceChain.name,
        nativeCurrency: {
          name: sourceChain.tokenSymbol,
          symbol: sourceChain.tokenSymbol,
          decimals: sourceChain.tokenDecimals,
        },
        rpcUrls: {
          default: { http: [sourceChain.rpcUrl] },
        },
      },
    })

    onProgress?.({ status: 'source_submitted', txHash })

    // Wait for transaction confirmation
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash })

    onProgress?.({
      status: 'source_finalized',
      txHash,
      sourceBlockNumber: Number(receipt.blockNumber),
    })

    // Extract request ID from logs (simplified - actual implementation would parse logs)
    const requestId = txHash // Use txHash as requestId for now

    return { txHash, requestId }
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
                sourceChain
                destChain
                sourceBlockNumber
                destBlockNumber
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

      // Map indexer status to our status
      const statusMap: Record<string, TransferStatus> = {
        SOURCE: 'source_finalized',
        HYPERBRIDGE: 'hyperbridge_relaying',
        DESTINATION: 'dest_finalized',
        TIMEOUT: 'timeout',
      }

      return {
        status: statusMap[request.status] || 'pending',
        requestId,
        sourceBlockNumber: request.sourceBlockNumber,
        destBlockNumber: request.destBlockNumber,
      }
    } catch (error) {
      return {
        status: 'pending',
        requestId,
        error: error instanceof Error ? error.message : 'Failed to fetch status',
      }
    }
  }

  async estimateFee(params: TeleportParams): Promise<bigint> {
    const { sourceChain, destChain, timeout = 3600 } = params

    if (sourceChain.type !== 'evm' || !sourceChain.gatewayAddress) {
      // For non-EVM chains, return a default fee estimate
      return BigInt(0)
    }

    try {
      const { createPublicClient, http } = await import('viem')

      const client = createPublicClient({
        transport: http(sourceChain.rpcUrl),
      })

      const destStateMachineId = this.encodeStateMachineId(destChain)

      const fee = await client.readContract({
        address: sourceChain.gatewayAddress as `0x${string}`,
        abi: TOKEN_GATEWAY_ABI,
        functionName: 'quote',
        args: [destStateMachineId as `0x${string}`, BigInt(timeout)],
      })

      return fee as bigint
    } catch {
      return BigInt(0)
    }
  }

  private encodeStateMachineId(chain: ChainConfig): `0x${string}` {
    // Encode chain as state machine ID
    // Format: chain_type (1 byte) + chain_id (4 bytes)
    if (chain.type === 'evm') {
      const chainId = chain.chainId || 1
      return `0x01${chainId.toString(16).padStart(8, '0')}` as `0x${string}`
    }
    // For substrate, use ss58 prefix
    const prefix = chain.ss58Prefix || 0
    return `0x02${prefix.toString(16).padStart(8, '0')}` as `0x${string}`
  }

  private encodeRecipient(address: string, chain: ChainConfig): `0x${string}` {
    if (chain.type === 'evm') {
      // EVM addresses are already hex
      return address.startsWith('0x') ? address as `0x${string}` : `0x${address}` as `0x${string}`
    }
    // For substrate, we need to decode SS58 to raw pubkey
    // This is a simplified version - actual implementation would decode SS58
    return `0x${address}` as `0x${string}`
  }
}

// Singleton instance
let gatewayService: TokenGatewayService | null = null

export function getTokenGatewayService(indexerUrl?: string): TokenGatewayService {
  if (!gatewayService) {
    const url = indexerUrl || process.env.NEXT_PUBLIC_HYPERBRIDGE_INDEXER || 'https://indexer.hyperbridge.network'
    gatewayService = new TokenGatewayService(url)
  }
  return gatewayService
}

