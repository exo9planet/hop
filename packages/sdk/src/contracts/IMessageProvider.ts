/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */
import type {
  BaseContract,
  BigNumber,
  BigNumberish,
  Signer,
  utils,
} from "ethers";
import type { EventFragment } from "@ethersproject/abi";
import type { Listener, Provider } from "@ethersproject/providers";
import type {
  TypedEventFilter,
  TypedEvent,
  TypedListener,
  OnEvent,
  PromiseOrValue,
} from "./common.js";

export interface IMessageProviderInterface extends utils.Interface {
  functions: {};

  events: {
    "InboxMessageDelivered(uint256,bytes)": EventFragment;
    "InboxMessageDeliveredFromOrigin(uint256)": EventFragment;
  };

  getEvent(nameOrSignatureOrTopic: "InboxMessageDelivered"): EventFragment;
  getEvent(
    nameOrSignatureOrTopic: "InboxMessageDeliveredFromOrigin"
  ): EventFragment;
}

export interface InboxMessageDeliveredEventObject {
  messageNum: BigNumber;
  data: string;
}
export type InboxMessageDeliveredEvent = TypedEvent<
  [BigNumber, string],
  InboxMessageDeliveredEventObject
>;

export type InboxMessageDeliveredEventFilter =
  TypedEventFilter<InboxMessageDeliveredEvent>;

export interface InboxMessageDeliveredFromOriginEventObject {
  messageNum: BigNumber;
}
export type InboxMessageDeliveredFromOriginEvent = TypedEvent<
  [BigNumber],
  InboxMessageDeliveredFromOriginEventObject
>;

export type InboxMessageDeliveredFromOriginEventFilter =
  TypedEventFilter<InboxMessageDeliveredFromOriginEvent>;

export interface IMessageProvider extends BaseContract {
  connect(signerOrProvider: Signer | Provider | string): this;
  attach(addressOrName: string): this;
  deployed(): Promise<this>;

  interface: IMessageProviderInterface;

  queryFilter<TEvent extends TypedEvent>(
    event: TypedEventFilter<TEvent>,
    fromBlockOrBlockhash?: string | number | undefined,
    toBlock?: string | number | undefined
  ): Promise<Array<TEvent>>;

  listeners<TEvent extends TypedEvent>(
    eventFilter?: TypedEventFilter<TEvent>
  ): Array<TypedListener<TEvent>>;
  listeners(eventName?: string): Array<Listener>;
  removeAllListeners<TEvent extends TypedEvent>(
    eventFilter: TypedEventFilter<TEvent>
  ): this;
  removeAllListeners(eventName?: string): this;
  off: OnEvent<this>;
  on: OnEvent<this>;
  once: OnEvent<this>;
  removeListener: OnEvent<this>;

  functions: {};

  callStatic: {};

  filters: {
    "InboxMessageDelivered(uint256,bytes)"(
      messageNum?: PromiseOrValue<BigNumberish> | null,
      data?: null
    ): InboxMessageDeliveredEventFilter;
    InboxMessageDelivered(
      messageNum?: PromiseOrValue<BigNumberish> | null,
      data?: null
    ): InboxMessageDeliveredEventFilter;

    "InboxMessageDeliveredFromOrigin(uint256)"(
      messageNum?: PromiseOrValue<BigNumberish> | null
    ): InboxMessageDeliveredFromOriginEventFilter;
    InboxMessageDeliveredFromOrigin(
      messageNum?: PromiseOrValue<BigNumberish> | null
    ): InboxMessageDeliveredFromOriginEventFilter;
  };

  estimateGas: {};

  populateTransaction: {};
}
