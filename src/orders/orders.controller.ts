import { Controller, Get, Query } from '@nestjs/common';
import { BigNumber } from 'nestjs-ethers';
import { MatchFilter } from './interfaces/match-filter.interface';
import { OrderFilter } from './interfaces/order-filter.interface';
import { OrdersService } from './orders.service';
import { Order } from './schemas/order.schema';

@Controller()
export class OrdersController {
  constructor(private orderService: OrdersService) {}

  @Get('getOrders')
  async getOrders(@Query() query: OrderFilter): Promise<Order[]> {
    return this.orderService.getOrders(query);
  }

  @Get('getMatchingOrders')
  getMatchingOrders(@Query() query: MatchFilter): Promise<BigNumber[]> {
    return this.orderService.getMatchingOrders(query);
  }
}
