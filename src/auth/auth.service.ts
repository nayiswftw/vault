import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { LoginDto } from './dto/login.dto';
import { UsersService } from '../users/users.service';

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(loginDto: LoginDto): Promise<{
    accessToken: string;
    tokenType: 'Bearer';
    expiresIn: string;
    user: AuthenticatedUser;
  }> {
    const user = await this.usersService.validateCredentials(
      loginDto.email,
      loginDto.password,
    );

    if (!user) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    if (!user.isActive) {
      throw new ForbiddenException('Inactive users cannot sign in.');
    }

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    const expiresIn = this.configService.get<string>('JWT_EXPIRES_IN', '1h');

    return {
      accessToken: this.jwtService.sign(payload),
      tokenType: 'Bearer',
      expiresIn,
      user: this.usersService.toPublicUser(user),
    };
  }
}
