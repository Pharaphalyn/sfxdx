import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OrdersModule } from './orders/orders.module';

@Module({
  imports: [
    MongooseModule.forRoot('mongodb://localhost/orderbook'),
    OrdersModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
