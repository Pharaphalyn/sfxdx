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
      this.processCreateEvent.bind(this),
      startBlock,
    );
    console.log('Processing match events from block ' + startBlock);
    await this.checkNewEvents(
      filterMatched,
      this.processMatchEvent.bind(this),
      startBlock,
    );
    console.log('Processing cancel events from block ' + startBlock);
    await this.checkNewEvents(
      filterCancelled,
      this.processCancelEvent.bind(this),
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

  async processCreateEvent(contractEvent) {
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
    const model = new this.orderModel(order);
    await model.save();
  }

  async processCancelEvent(contractEvent) {
    await this.orderModel
      .updateOne(
        { transactionId: contractEvent.args.id.toString() },
        {
          $set: { active: false, block: contractEvent.blockNumber },
        },
      )
      .exec();
  }

  async processMatchEvent(contractEvent) {
    const data = contractEvent.args;
    const transaction = await this.orderModel
      .findOne({ transactionId: data.matchedId.toString() })
      .exec();

    //race condition hack
    if (data.matchedId.toString() !== '0' && transaction === null) {
      setTimeout(() => this.processMatchEvent(contractEvent), 1000);
      return;
    }
    if (transaction) {
      let leftToFill: BigNumber = BigNumber.from(transaction.amountLeftToFill);
      leftToFill = leftToFill.sub(data.amountReceived);
      const newData = {
        amountLeftToFill: leftToFill.toString(),
        active: true,
        block: contractEvent.blockNumber,
      };
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
    }
    let documents = await this.orderModel.find(query).exec();
    if (!query.isMarket) {
      documents = documents.filter((doc) => {
        const orderAmountA = BigNumber.from(doc.amountA);
        const orderAmountB = BigNumber.from(doc.amountB);
        const userAmountA = BigNumber.from(filter.amountA);
        const userAmountB = BigNumber.from(filter.amountB);

        return orderAmountA.mul(userAmountA).lte(userAmountB.mul(orderAmountB));
      });
    }
    return documents.map((doc) => BigNumber.from(doc.transactionId));
  }
}
