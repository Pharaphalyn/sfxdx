import { ApiProperty } from '@nestjs/swagger';
import { IsNumberString, IsAlphanumeric } from 'class-validator';

export class MatchFilter {
  @ApiProperty()
  @IsAlphanumeric()
  tokenA: string;

  @ApiProperty()
  @IsAlphanumeric()
  tokenB: string;

  @ApiProperty()
  @IsNumberString()
  amountA?: string;

  @ApiProperty()
  @IsNumberString()
  amountB: string;

  @ApiProperty()
  isMarket?: boolean;
}
