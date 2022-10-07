import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import {
  EthersContract,
  Contract,
  Wallet,
  BaseProvider,
  InjectEthersProvider,
  BigNumber,
} from 'nestjs-ethers';
import { abi } from 'src/resources/contracts/order-controller';
import { MatchFilter } from './interfaces/match-filter.interface';
import { OrderEvent } from './interfaces/order-event.interface';
import { OrderFilter } from './interfaces/order-filter.interface';
import { Order, OrderDocument } from './schemas/order.schema';
import { Constants as constants } from 'src/resources/config/constants';

@Injectable()
export class OrdersService implements OnApplicationBootstrap {
  contract: Contract;

  constructor(
    private ethers: EthersContract,
    @InjectEthersProvider()
    private ethersProvider: BaseProvider,
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
  ) {}

  async onApplicationBootstrap() {
    const lastOrder = await this.orderModel.findOne().sort({ block: -1 });
    const startBlock = lastOrder ? lastOrder.block + 1 : 0;
    const wallet: Wallet = new Wallet(
      constants.WALLET_KEY,
      this.ethersProvider,
    );
    this.contract = await this.ethers.create(
      constants.CONTRACT_ADDRESS,
      abi,
      wallet,
    );
    const filterCreated = this.contract.filters.OrderCreated();
    const filterMatched = this.contract.filters.OrderMatched();
    const filterCancelled = this.contract.filters.OrderCancelled();
    console.log('Processing create events from block ' + startBlock);
    await this.checkNewEvents(
      filterCreated,
      this.processCreateEvent,
      startBlock,
    );
    console.log('Processing match events from block ' + startBlock);
    await this.checkNewEvents(
      filterMatched,
      this.processMatchEvent,
      startBlock,
    );
    console.log('Processing cancel events from block ' + startBlock);
    await this.checkNewEvents(
      filterCancelled,
      this.processCancelEvent,
      startBlock,
    );
    console.log('Up and running');
  }

  async checkNewEvents(filter, processFunc, startBlock) {
    const events = await this.contract.queryFilter(filter, startBlock);
    for (const contractEvent of events) {
      await processFunc(contractEvent, this.orderModel);
    }
    this.contract.on(filter, (...data) =>
      processFunc(data[data.length - 1], this.orderModel),
    );
  }

  async processCreateEvent(contractEvent, orderModel) {
    console.log(contractEvent);
    const args: OrderEvent = contractEvent.args as unknown as OrderEvent;
    const order: Order = {
      transactionId: args.id.toString(),
      tokenA: args.tokenA,
      tokenB: args.tokenB,
      amountA: args.amountA.toString(),
      amountLeftToFill: args.amountB.toString(),
      price: args.amountA.div(args.amountB).toString(),
      amountB: args.amountB.toString(),
      user: args.user,
      isMarket: args.isMarket,
      block: contractEvent.blockNumber,
      active: true,
    };
    const model = new orderModel(order);
    await model.save();
  }

  async processCancelEvent(contractEvent) {
    await this.orderModel
      .updateOne(
        { transactionId: contractEvent.args.id.toString() },
        {
          $set: { active: false },
        },
      )
      .exec();
  }

  async processMatchEvent(contractEvent) {
    const data = contractEvent.args;
    const transaction = await this.orderModel
      .findOne({ transactionId: data.matchedId })
      .exec();
    if (transaction) {
      let leftToFill: BigNumber = BigNumber.from(transaction.amountLeftToFill);
      leftToFill = leftToFill.sub(data.amountReceived);
      const newData = { amountLeftToFill: leftToFill.toString(), active: true };
      if (leftToFill.toString() === '0') {
        newData.active = false;
      }
      await this.orderModel
        .updateOne(
          { transactionId: transaction.transactionId },
          { $set: newData },
        )
        .exec();
    }
  }

  async getOrders(filter: OrderFilter): Promise<Order[]> {
    const query: FilterQuery<OrderDocument> = {
      $or: [
        {
          tokenA: filter.tokenA || /^.*/,
          tokenB: filter.tokenB || /^.*/,
        },
        {
          tokenA: filter.tokenB || /^.*/,
          tokenB: filter.tokenA || /^.*/,
        },
      ],
      user: filter.user || /^.*/,
    };
    if (filter.active === 'true') {
      query.active = true;
    }
    return this.orderModel.find(query, { block: 0 }).exec();
  }

  async getMatchingOrders(filter: MatchFilter): Promise<BigNumber[]> {
    const query: FilterQuery<OrderDocument> = {
      tokenA: filter.tokenB,
      tokenB: filter.tokenA,
      active: true,
    };
    if (filter.amountA === '0') {
      query.isMarket = true;
    } else {
      query.price = {
        $lte: BigNumber.from(filter.amountB)
          .div(BigNumber.from(filter.amountA))
          .toString(),
      };
    }
    const documents = await this.orderModel.find(query).exec();
    // console.log(
    //   await this.contract.matchOrders(
    //     documents.map((doc) => BigNumber.from(doc.transactionId)),
    //     filter.tokenA,
    //     filter.tokenB,
    //     BigNumber.from(filter.amountA),
    //     BigNumber.from(filter.amountB),
    //     true,
    //   ),
    // );
    // console.log(
    //   await this.contract.createOrder(
    //     filter.tokenA,
    //     filter.tokenB,
    //     BigNumber.from(filter.amountA),
    //     BigNumber.from(filter.amountB),
    //   ),
    // );
    return documents.map((doc) => BigNumber.from(doc.transactionId));
  }
}
