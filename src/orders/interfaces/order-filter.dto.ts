import { ApiProperty } from '@nestjs/swagger';

export class OrderFilter {
  @ApiProperty()
  tokenA?: string;

  @ApiProperty()
  tokenB?: string;

  @ApiProperty()
  user?: string;

  @ApiProperty()
  active?: string;
}
