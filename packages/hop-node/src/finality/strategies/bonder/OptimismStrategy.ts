import { FinalityStrategy } from '../FinalityStrategy'
import { IFinalityStrategy } from '../IFinalityStrategy'
import { getCustomOptimismSafeBlockNumber } from '../utils'

export class OptimismStrategy extends FinalityStrategy implements IFinalityStrategy {
  getSafeBlockNumber = async (): Promise<number> => {
    const blockNumber = await getCustomOptimismSafeBlockNumber(this.chainSlug)
    if (blockNumber) {
      return blockNumber
    }

    // Optimism's safe can be reorged, so we must use finalized block number as the safe block number if
    // the custom implementation is not available.
    return this.getFinalizedBlockNumber()
  }

  getCustomBlockNumber = async (): Promise<number> => {
    return this.getSafeBlockNumber()
  }
}
