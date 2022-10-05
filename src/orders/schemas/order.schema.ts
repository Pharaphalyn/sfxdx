import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type OrderDocument = Order & Document;

@Schema()
export class Order {
  @Prop({ required: true })
  transactionId: string;

  @Prop({ required: true })
  amountA: string;

  @Prop({ required: true })
  amountB: string;

  @Prop({ required: true })
  tokenA: string;

  @Prop({ required: true })
  tokenB: string;

  @Prop({ required: true })
  user: string;

  @Prop({ required: true })
  isMarket: boolean;

  @Prop({ required: true })
  block: number;

  @Prop({ required: true })
  active: boolean;
}
export const OrderSchema = SchemaFactory.createForClass(Order);
