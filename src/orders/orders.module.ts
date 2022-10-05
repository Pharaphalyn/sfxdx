import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { Order, OrderSchema } from './schemas/order.schema';
import { EthersModule, RINKEBY_NETWORK } from 'nestjs-ethers';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Order.name, schema: OrderSchema }]),
    EthersModule.forRoot({
      network: RINKEBY_NETWORK,
      infura: {
        projectId: 'd70f5340181b4f3b918707b0b8376e23',
        projectSecret: 'd70f5340181b4f3b918707b0b8376e23',
      },
      useDefaultProvider: true,
    }),
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
