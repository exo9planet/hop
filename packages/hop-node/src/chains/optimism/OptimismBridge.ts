import AbstractChainBridge from '../AbstractChainBridge'
import AlchemyInclusionService from './inclusion/AlchemyInclusionService'
import Derive from './Derive'
import { CanonicalMessengerRootConfirmationGasLimit } from 'src/constants'
import { CrossChainMessenger, MessageStatus } from '@eth-optimism/sdk'
import { IChainBridge } from '../IChainBridge'
import { IInclusionService, InclusionServiceConfig } from './inclusion/IInclusionService'
import { config as globalConfig } from 'src/config'
import { providers } from 'ethers'

type CachedCustomSafeBlockNumber = {
  lastCacheTimestampMs: number
  l2BlockNumberCustomSafe: number
}

class OptimismBridge extends AbstractChainBridge implements IChainBridge {
  csm: CrossChainMessenger
  derive: Derive = new Derive()
  inclusionService: IInclusionService | undefined
  private customSafeBlockNumberCache: CachedCustomSafeBlockNumber

  constructor (chainSlug: string) {
    super(chainSlug)

    this.csm = new CrossChainMessenger({
      bedrock: true,
      l1ChainId: globalConfig.isMainnet ? 1 : 5,
      l2ChainId: this.chainId,
      l1SignerOrProvider: this.l1Wallet,
      l2SignerOrProvider: this.l2Wallet
    })

    this.customSafeBlockNumberCache = {
      lastCacheTimestampMs: 0,
      l2BlockNumberCustomSafe: 0
    }

    const inclusionServiceConfig: InclusionServiceConfig = {
      chainSlug: this.chainSlug,
      l1Wallet: this.l1Wallet,
      l2Wallet: this.l2Wallet,
      logger: this.logger
    }

    this.inclusionService = new AlchemyInclusionService(inclusionServiceConfig)
  }

  async relayL1ToL2Message (l1TxHash: string): Promise<providers.TransactionResponse> {
    try {
      // Need an arbitrary value that will always succeed
      const gasLimit = 1000000
      const message = await this.csm.toCrossChainMessage(l1TxHash)
      // Signer is needed to execute tx with SDK
      const txOpts: any = {
        signer: this.l2Wallet,
        overrides: {
          gasLimit
        }
      }
      return this.csm.resendMessage(message, txOpts)
    } catch (err) {
      throw new Error(`relayL1ToL2Message error: ${err.message}`)
    }
  }

  // This function will only handle one stage at a time. Upon completion of a stage, the poller will re-call
  // this when the next stage is ready.
  // It is expected that the poller re-calls this message every hour during the challenge period, if the
  // transfer was challenged. The complexity of adding DB state to track successful/failed root prove txs
  // and challenges is not worth saving the additional RPC calls (2) per hour during the challenge period.
  async relayL2ToL1Message (l2TxHash: string): Promise<providers.TransactionResponse> {
    const messageStatus: MessageStatus = await this.csm.getMessageStatus(l2TxHash)
    if (
      messageStatus === MessageStatus.UNCONFIRMED_L1_TO_L2_MESSAGE ||
      messageStatus === MessageStatus.FAILED_L1_TO_L2_MESSAGE ||
      messageStatus === MessageStatus.RELAYED
    ) {
      throw new Error(`unexpected message status: ${messageStatus}, l2TxHash: ${l2TxHash}`)
    }

    if (messageStatus === MessageStatus.STATE_ROOT_NOT_PUBLISHED) {
      throw new Error('state root not published')
    }

    if (messageStatus === MessageStatus.READY_TO_PROVE) {
      this.logger.info('sending proveMessage tx')
      const resolved = await this.csm.toCrossChainMessage(l2TxHash)
      return this.csm.proveMessage(resolved)
    }

    if (messageStatus === MessageStatus.IN_CHALLENGE_PERIOD) {
      throw new Error('message in challenge period')
    }

    if (messageStatus === MessageStatus.READY_FOR_RELAY) {
      this.logger.info('sending finalizeMessage tx')
      const overrides: any = {
        gasLimit: CanonicalMessengerRootConfirmationGasLimit
      }
      return this.csm.finalizeMessage(l2TxHash, { overrides })
    }

    throw new Error(`state not handled for tx ${l2TxHash}`)
  }

  async getL1InclusionTx (l2TxHash: string): Promise<providers.TransactionReceipt | undefined> {
    if (!this.inclusionService) return
    return this.inclusionService.getL1InclusionTx(l2TxHash)
  }

  async getL2InclusionTx (l1TxHash: string): Promise<providers.TransactionReceipt | undefined> {
    if (!this.inclusionService) return
    return this.inclusionService.getL2InclusionTx(l1TxHash)
  }

  async getCustomSafeBlockNumber (): Promise<number | undefined> {
    if (
      !this.inclusionService?.getLatestL1InclusionTxBeforeBlockNumber ||
      !this.inclusionService?.getLatestL2TxFromL1ChannelTx
    ) {
      this.logger.error('getCustomSafeBlockNumber: includeService not available')
      return
    }

    // Use a cache since the granularity of finality updates on l1 is on the order of minutes
    if (
      this._hasCacheBeenSet() &&
      !this._isCacheExpired()
    ) {
      const cacheValue = this.customSafeBlockNumberCache.l2BlockNumberCustomSafe
      this.logger.info(`getCustomSafeBlockNumber: using cached value ${cacheValue}`)
      return cacheValue
    }

    // Always update the cache with the latest block number. If the following calls fail, the cache
    // will never be updated and we will get into a loop.
    const now = Date.now()
    this._updateCache(now)

    // Get the latest checkpoint on L1
    const l1SafeBlock: providers.Block = await this.l1Wallet.provider!.getBlock('safe')
    const l1InclusionTx = await this.inclusionService.getLatestL1InclusionTxBeforeBlockNumber(l1SafeBlock.number)
    if (!l1InclusionTx) {
      this.logger.error(`getCustomSafeBlockNumber: no L1 inclusion tx found before block ${l1SafeBlock.number}`)
      return
    }

    // Derive the L2 block number from the L1 inclusion tx
    const latestSafeL2Tx = await this.inclusionService.getLatestL2TxFromL1ChannelTx(l1InclusionTx.transactionHash)
    const customSafeBlockNumber = latestSafeL2Tx?.blockNumber
    if (!customSafeBlockNumber) {
      this.logger.error(`getCustomSafeBlockNumber: no L2 tx found for L1 inclusion tx ${l1InclusionTx.transactionHash}`)
      return
    }

    this._updateCache(now, customSafeBlockNumber)
    return customSafeBlockNumber
  }

  private _hasCacheBeenSet (): boolean {
    return this.customSafeBlockNumberCache.l2BlockNumberCustomSafe !== 0
  }

  private _isCacheExpired (): boolean {
    const now = Date.now()
    const cacheExpirationTimeMs = 60 * 1000
    const lastCacheTimestampMs = this.customSafeBlockNumberCache.lastCacheTimestampMs
    return now - lastCacheTimestampMs > cacheExpirationTimeMs
  }

  private _updateCache (lastCacheTimestampMs: number, l2BlockNumber?: number): void {
    this.customSafeBlockNumberCache = {
      lastCacheTimestampMs: lastCacheTimestampMs,
      l2BlockNumberCustomSafe: l2BlockNumber ?? this.customSafeBlockNumberCache.l2BlockNumberCustomSafe
    }
  }
}

export default OptimismBridge
