import { Controller, Get, Query } from '@nestjs/common';
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
  getMatchingOrders(): string {
    return 'Matching Orders';
  }
}
