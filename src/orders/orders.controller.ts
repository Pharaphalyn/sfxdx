import { Controller, Get, Query } from '@nestjs/common';
import { OrderFilter } from './interfaces/order-filter.interface';
import { OrdersService } from './orders.service';

@Controller()
export class OrdersController {
  constructor(private orderService: OrdersService) {}

  @Get('getOrders')
  getOrders(@Query() query: OrderFilter): string {
    return 'Orders';
  }

  @Get('getMatchingOrders')
  getMatchingOrders(): string {
    return 'Matching Orders';
  }
}
