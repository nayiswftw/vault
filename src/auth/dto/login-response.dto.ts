import { ApiProperty } from '@nestjs/swagger';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';

export class LoginResponseDto {
  @ApiProperty()
  accessToken!: string;

  @ApiProperty()
  refreshToken!: string;

  @ApiProperty({ example: 'Bearer' })
  tokenType!: 'Bearer';

  @ApiProperty()
  expiresIn!: string;

  @ApiProperty()
  refreshTokenExpiresIn!: string;

  @ApiProperty()
  user!: AuthenticatedUser;
}
