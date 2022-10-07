import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { Order, OrderSchema } from './schemas/order.schema';
import { EthersModule, GOERLI_NETWORK } from 'nestjs-ethers';
import { Constants as constants } from 'src/resources/config/constants';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Order.name, schema: OrderSchema }]),
    EthersModule.forRoot({
      network: GOERLI_NETWORK,
      infura: {
        projectId: constants.INFURA_ID,
        projectSecret: constants.INFURA_SECRET,
      },
      useDefaultProvider: true,
    }),
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
