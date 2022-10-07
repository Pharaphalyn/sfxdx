import { ApiProperty } from '@nestjs/swagger';

export class OrderFilter {
  @ApiProperty({ required: false })
  tokenA?: string;

  @ApiProperty({ required: false })
  tokenB?: string;

  @ApiProperty({ required: false })
  user?: string;

  @ApiProperty({ required: false })
  active?: string;
}
