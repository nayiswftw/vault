import { ApiProperty } from '@nestjs/swagger';

export class HealthResponseDto {
  @ApiProperty({ example: 'ok' })
  status!: 'ok';

  @ApiProperty()
  service!: string;
}

export class ReadinessResponseDto {
  @ApiProperty({ example: 'ok' })
  status!: 'ok';

  @ApiProperty()
  service!: string;

  @ApiProperty({ example: 'up' })
  database!: 'up';

  @ApiProperty()
  timestamp!: string;
}
