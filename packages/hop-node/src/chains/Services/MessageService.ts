import AbstractService from './AbstractService'
import { providers } from 'ethers'

export class MessageUnknownError extends Error {}
export class MessageInFlightError extends Error {}
export class MessageRelayedError extends Error {}
export class MessageInvalidError extends Error {}

export enum MessageDirection {
  L1_TO_L2 = 0,
  L2_TO_L1 = 1
}

export interface IMessageService {
  relayL1ToL2Message?(l1TxHash: string, messageIndex?: number): Promise<providers.TransactionResponse>
  relayL2ToL1Message (l2TxHash: string, messageIndex?: number): Promise<providers.TransactionResponse>
}

abstract class MessageService<Message, MessageStatus, RelayOptions = null> extends AbstractService {
  protected abstract getMessage (txHash: string, opts: RelayOptions | null): Promise<Message>
  protected abstract getMessageStatus (message: Message, opts: RelayOptions | null): Promise<MessageStatus>
  protected abstract sendRelayTransaction (message: Message, relayOpts: RelayOptions | null): Promise<providers.TransactionResponse>
  protected abstract isMessageInFlight (messageStatus: MessageStatus): Promise<boolean> | boolean
  protected abstract isMessageRelayable (messageStatus: MessageStatus): Promise<boolean> | boolean
  protected abstract isMessageRelayed (messageStatus: MessageStatus): Promise<boolean> | boolean

  // Call a private method so the validation is guaranteed to run in order
  protected async validateMessageAndSendTransaction (txHash: string, relayOpts: RelayOptions | null = null): Promise<providers.TransactionResponse> {
    return this._validateMessageAndSendTransaction(txHash, relayOpts)
  }

  private async _validateMessageAndSendTransaction (txHash: string, relayOpts: RelayOptions | null): Promise<providers.TransactionResponse> {
    const message: Message = await this.getMessage(txHash, relayOpts)
    const messageStatus: MessageStatus = await this.getMessageStatus(message, relayOpts)
    await this.validateMessageStatus(messageStatus)
    return this.sendRelayTransaction(message, relayOpts)
  }

  private async validateMessageStatus (messageStatus: MessageStatus): Promise<void> {
    if (!messageStatus) {
      throw new MessageUnknownError('validateMessageStatus: Unknown message status')
    }

    if (await this.isMessageInFlight(messageStatus)) {
      throw new MessageInFlightError('validateMessageStatus: Message has not yet been checkpointed')
    }

    if (await this.isMessageRelayed(messageStatus)) {
      throw new MessageRelayedError('validateMessageStatus: Message has already been relayed')
    }

    // If the message is here but is not relayable, it is in an invalid state
    if (!(await this.isMessageRelayable(messageStatus))) {
      throw new MessageInvalidError('validateMessageStatus: Invalid message state')
    }
  }
}

export default MessageService
