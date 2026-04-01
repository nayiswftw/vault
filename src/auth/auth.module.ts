import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';

const parseJwtExpiresIn = (value: string): number => {
  const normalizedValue = value.trim();
  const asNumber = Number(normalizedValue);

  if (Number.isInteger(asNumber) && asNumber > 0) {
    return asNumber;
  }

  const match = normalizedValue.match(/^(\d+)([smhd])$/i);
  if (!match) {
    throw new Error(
      'JWT_EXPIRES_IN must be a positive number of seconds or use suffixes s, m, h, d.',
    );
  }

  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();

  if (unit === 's') {
    return amount;
  }

  if (unit === 'm') {
    return amount * 60;
  }

  if (unit === 'h') {
    return amount * 60 * 60;
  }

  return amount * 60 * 60 * 24;
};

@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const expiresIn = configService.get<string>('JWT_EXPIRES_IN', '1h');

        return {
          secret: configService.getOrThrow<string>('JWT_SECRET'),
          signOptions: {
            expiresIn: parseJwtExpiresIn(expiresIn),
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
