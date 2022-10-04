import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EthersContract } from 'nestjs-ethers';
import { OrderFilter } from './interfaces/order-filter.interface';
import { Order, OrderDocument } from './schemas/order.schema';

@Injectable()
export class OrdersService implements OnApplicationBootstrap {
  constructor(
    private ethers: EthersContract,
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
  ) {}

  onApplicationBootstrap() {
  }

  async addOrder(order: OrderFilter) {
    const newOrder = new this.orderModel(order);
    return newOrder.save();
  }

  async getOrders() {
    return this.orderModel.find().exec();
  }
}
