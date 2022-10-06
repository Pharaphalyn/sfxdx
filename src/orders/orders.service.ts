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
import { OrderEvent } from './interfaces/order-event.interface';
import { OrderFilter } from './interfaces/order-filter.interface';
import { Order, OrderDocument } from './schemas/order.schema';

@Injectable()
export class OrdersService implements OnApplicationBootstrap {
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
      '124f9c2b8cb8ba493302f00cf4a7646fc0c4477143161f61bcd17be2a4f73934',
      this.ethersProvider,
    );
    const contract: Contract = await this.ethers.create(
      '0xC7dd7d4730d95AAE47F27c32eBb85b04fc78769E',
      abi,
      wallet,
    );
    let filter = contract.filters.OrderCreated();
    let events = await contract.queryFilter(filter, startBlock);
    for (const contractEvent of events) {
      await this.processCreateEvent(contractEvent);
    }
    filter = contract.filters.OrderMatched();
    events = await contract.queryFilter(filter, startBlock);
    for (const contractEvent of events) {
      await this.processMatchedEvent(contractEvent);
    }
    filter = contract.filters.OrderCancelled();
    events = await contract.queryFilter(filter, startBlock);
    for (const contractEvent of events) {
      await this.processCancelEvent(contractEvent);
    }
  }

  async processCreateEvent(contractEvent) {
    const args: OrderEvent = contractEvent.args as unknown as OrderEvent;
    const order: Order = {
      transactionId: args.id.toString(),
      tokenA: args.tokenA,
      tokenB: args.tokenB,
      amountA: args.amountA.toString(),
      amountLeftToFill: args.amountB.toString(),
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
          $set: { active: false },
        },
      )
      .exec();
  }

  async processMatchedEvent(contractEvent) {
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
    return this.orderModel.find(query).exec();
  }
}
