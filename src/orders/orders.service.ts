import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import {
  EthersContract,
  Contract,
  Wallet,
  BaseProvider,
  InjectEthersProvider,
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
    const lastOrder = await this.orderModel.findOne().sort({ $natural: -1 });
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
    const filter = contract.filters.OrderCreated();
    const events = await contract.queryFilter(filter, startBlock);
    for (const contractEvent of events) {
      this.processCreateEvent(contractEvent);
    }
  }

  async processCreateEvent(contractEvent) {
    const args: OrderEvent = contractEvent.args as unknown as OrderEvent;
    const order: Order = {
      transactionId: args.id.toString(),
      tokenA: args.tokenA,
      tokenB: args.tokenB,
      amountA: args.amountA.toString(),
      amountB: args.amountB.toString(),
      user: args.user,
      isMarket: args.isMarket,
      block: contractEvent.blockNumber,
      active: true,
    };
    const model = new this.orderModel(order);
    await model.save();
  }

  //   async addOrder(order: OrderFilter) {
  //     const newOrder = new this.orderModel(order);
  //     return newOrder.save();
  //   }

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
    if (filter.active) {
      query.active = true;
    }
    return this.orderModel.find(query).exec();
  }
}
