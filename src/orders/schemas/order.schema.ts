import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type OrderDocument = Order & Document;

@Schema()
export class Order {
  @Prop({ required: true })
  id: string;

  @Prop({ required: true })
  amountA: string;

  @Prop({ required: true })
  amountB: number;

  @Prop({ required: true })
  tokenA: string;

  @Prop({ required: true })
  tokenB: string;

  @Prop({ required: true })
  user: string;

  @Prop({ required: true })
  isMarket: boolean;
}
export const OrderSchema = SchemaFactory.createForClass(Order);
