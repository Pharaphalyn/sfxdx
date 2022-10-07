import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OrdersModule } from './orders/orders.module';
import { Constants as constants } from './resources/config/constants';

@Module({
  imports: [MongooseModule.forRoot(constants.DB_CONNECT), OrdersModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
