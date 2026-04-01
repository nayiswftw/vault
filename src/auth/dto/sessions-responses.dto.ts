import { ApiProperty } from '@nestjs/swagger';

export class SessionDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  expiresAt!: string;

  @ApiProperty({ nullable: true })
  lastUsedAt!: string | null;

  @ApiProperty({ nullable: true })
  userAgent!: string | null;

  @ApiProperty({ nullable: true })
  ipAddress!: string | null;
}

export class SessionsResponseDto {
  @ApiProperty({ type: [SessionDto] })
  data!: SessionDto[];
}

export class RevokeSessionResponseDto {
  @ApiProperty()
  revokedSessionId!: string;
}

export class RevokeAllSessionsResponseDto {
  @ApiProperty()
  revokedSessions!: number;
}
