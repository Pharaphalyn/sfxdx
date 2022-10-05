import { BigNumber } from 'nestjs-ethers';

export class OrderEvent {
  id: BigNumber;
  tokenA?: string;
  tokenB?: string;
  user?: string;
  amountA: BigNumber;
  amountB: BigNumber;
  isMarket: boolean;
}
