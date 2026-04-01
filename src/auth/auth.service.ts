import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes, randomUUID } from 'crypto';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { PrismaService } from '../prisma/prisma.service';
import { User } from '../users/entities/user.entity';
import { LoginDto } from './dto/login.dto';
import { SessionDto } from './dto/sessions-responses.dto';
import { parseTokenDurationToSeconds } from './utils/token-duration.util';
import { UsersService } from '../users/users.service';

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

interface SessionMetadata {
  userAgent: string | null;
  ipAddress: string | null;
}

interface ParsedRefreshToken {
  sessionId: string;
}

type AuthTokensResponse = {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: string;
  refreshTokenExpiresIn: string;
  user: AuthenticatedUser;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(
    loginDto: LoginDto,
    sessionMetadata: SessionMetadata,
  ): Promise<AuthTokensResponse> {
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

    return await this.issueTokensForUser(user, sessionMetadata);
  }

  async refresh(
    refreshToken: string,
    sessionMetadata: SessionMetadata,
  ): Promise<AuthTokensResponse> {
    const parsedRefreshToken = this.parseRefreshToken(refreshToken);
    const existingSession = await this.prisma.refreshToken.findUnique({
      where: {
        id: parsedRefreshToken.sessionId,
      },
    });

    if (
      !existingSession ||
      !this.isRefreshTokenMatch(refreshToken, existingSession.tokenHash)
    ) {
      throw new UnauthorizedException('Refresh token is invalid.');
    }

    const now = new Date();

    if (existingSession.revokedAt) {
      await this.revokeAllActiveSessionsByUserId(existingSession.userId, now);
      throw new UnauthorizedException('Refresh token has been revoked.');
    }

    if (existingSession.expiresAt.getTime() <= now.getTime()) {
      await this.revokeSessionById(existingSession.id, now);
      throw new UnauthorizedException('Refresh token has expired.');
    }

    const user = await this.usersService.findInternalById(
      existingSession.userId,
    );
    if (!user || !user.isActive) {
      await this.revokeSessionById(existingSession.id, now);
      throw new UnauthorizedException('Token is invalid or user is inactive.');
    }

    const refreshTokenExpiresIn = this.getRefreshTokenExpiresIn();
    const refreshTokenTtlSeconds = parseTokenDurationToSeconds(
      refreshTokenExpiresIn,
      'JWT_REFRESH_EXPIRES_IN',
    );
    const nextSessionId = randomUUID();
    const nextRefreshToken = this.buildRefreshTokenValue(nextSessionId);
    const nextRefreshTokenHash = this.hashRefreshToken(nextRefreshToken);
    const nextExpiresAt = new Date(
      now.getTime() + refreshTokenTtlSeconds * 1000,
    );

    await this.prisma.$transaction(async (tx) => {
      await tx.refreshToken.update({
        where: {
          id: existingSession.id,
        },
        data: {
          revokedAt: now,
          replacedByTokenId: nextSessionId,
          lastUsedAt: now,
        },
      });

      await tx.refreshToken.create({
        data: {
          id: nextSessionId,
          userId: user.id,
          tokenHash: nextRefreshTokenHash,
          expiresAt: nextExpiresAt,
          userAgent: sessionMetadata.userAgent,
          ipAddress: sessionMetadata.ipAddress,
        },
      });
    });

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      refreshToken: nextRefreshToken,
      tokenType: 'Bearer',
      expiresIn: this.getAccessTokenExpiresIn(),
      refreshTokenExpiresIn,
      user: this.usersService.toPublicUser(user),
    };
  }

  async logout(refreshToken: string): Promise<{ revokedSessionId: string }> {
    const parsedRefreshToken = this.parseRefreshToken(refreshToken);
    const existingSession = await this.prisma.refreshToken.findUnique({
      where: {
        id: parsedRefreshToken.sessionId,
      },
    });

    if (
      !existingSession ||
      !this.isRefreshTokenMatch(refreshToken, existingSession.tokenHash)
    ) {
      throw new UnauthorizedException('Refresh token is invalid.');
    }

    if (!existingSession.revokedAt) {
      const revokedAt = new Date();
      await this.prisma.refreshToken.update({
        where: {
          id: existingSession.id,
        },
        data: {
          revokedAt,
          lastUsedAt: revokedAt,
        },
      });
    }

    return {
      revokedSessionId: existingSession.id,
    };
  }

  async getActiveSessions(userId: string): Promise<{ data: SessionDto[] }> {
    const now = new Date();
    const sessions = await this.prisma.refreshToken.findMany({
      where: {
        userId,
        revokedAt: null,
        expiresAt: {
          gt: now,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      data: sessions.map((session) => this.toSessionDto(session)),
    };
  }

  async revokeSession(
    userId: string,
    sessionId: string,
  ): Promise<{ revokedSessionId: string }> {
    const session = await this.prisma.refreshToken.findUnique({
      where: {
        id: sessionId,
      },
    });

    if (!session || session.userId !== userId) {
      throw new NotFoundException('Session was not found.');
    }

    if (!session.revokedAt) {
      const revokedAt = new Date();
      await this.prisma.refreshToken.update({
        where: {
          id: session.id,
        },
        data: {
          revokedAt,
          lastUsedAt: revokedAt,
        },
      });
    }

    return {
      revokedSessionId: session.id,
    };
  }

  async revokeAllSessions(
    userId: string,
  ): Promise<{ revokedSessions: number }> {
    const revokedAt = new Date();
    const result = await this.prisma.refreshToken.updateMany({
      where: {
        userId,
        revokedAt: null,
        expiresAt: {
          gt: revokedAt,
        },
      },
      data: {
        revokedAt,
      },
    });

    return {
      revokedSessions: result.count,
    };
  }

  private async issueTokensForUser(
    user: User,
    sessionMetadata: SessionMetadata,
  ): Promise<AuthTokensResponse> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    const refreshTokenExpiresIn = this.getRefreshTokenExpiresIn();
    const refreshTokenTtlSeconds = parseTokenDurationToSeconds(
      refreshTokenExpiresIn,
      'JWT_REFRESH_EXPIRES_IN',
    );
    const sessionId = randomUUID();
    const refreshToken = this.buildRefreshTokenValue(sessionId);

    await this.prisma.refreshToken.create({
      data: {
        id: sessionId,
        userId: user.id,
        tokenHash: this.hashRefreshToken(refreshToken),
        expiresAt: new Date(Date.now() + refreshTokenTtlSeconds * 1000),
        userAgent: sessionMetadata.userAgent,
        ipAddress: sessionMetadata.ipAddress,
      },
    });

    return {
      accessToken: this.jwtService.sign(payload),
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: this.getAccessTokenExpiresIn(),
      refreshTokenExpiresIn,
      user: this.usersService.toPublicUser(user),
    };
  }

  private getAccessTokenExpiresIn(): string {
    return this.configService.get<string>('JWT_EXPIRES_IN', '1h');
  }

  private getRefreshTokenExpiresIn(): string {
    return this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d');
  }

  private parseRefreshToken(refreshToken: string): ParsedRefreshToken {
    const token = refreshToken.trim();
    const separatorIndex = token.indexOf('.');

    if (separatorIndex <= 0 || separatorIndex === token.length - 1) {
      throw new UnauthorizedException('Refresh token is invalid.');
    }

    return {
      sessionId: token.slice(0, separatorIndex),
    };
  }

  private buildRefreshTokenValue(sessionId: string): string {
    const secret = randomBytes(48).toString('base64url');
    return `${sessionId}.${secret}`;
  }

  private hashRefreshToken(refreshToken: string): string {
    return createHash('sha256').update(refreshToken).digest('hex');
  }

  private isRefreshTokenMatch(
    refreshToken: string,
    tokenHash: string,
  ): boolean {
    return this.hashRefreshToken(refreshToken) === tokenHash;
  }

  private async revokeSessionById(
    sessionId: string,
    revokedAt: Date,
  ): Promise<void> {
    await this.prisma.refreshToken.update({
      where: {
        id: sessionId,
      },
      data: {
        revokedAt,
        lastUsedAt: revokedAt,
      },
    });
  }

  private async revokeAllActiveSessionsByUserId(
    userId: string,
    revokedAt: Date,
  ): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: {
        userId,
        revokedAt: null,
        expiresAt: {
          gt: revokedAt,
        },
      },
      data: {
        revokedAt,
      },
    });
  }

  private toSessionDto(session: {
    id: string;
    createdAt: Date;
    expiresAt: Date;
    lastUsedAt: Date | null;
    userAgent: string | null;
    ipAddress: string | null;
  }): SessionDto {
    return {
      id: session.id,
      createdAt: session.createdAt.toISOString(),
      expiresAt: session.expiresAt.toISOString(),
      lastUsedAt: session.lastUsedAt ? session.lastUsedAt.toISOString() : null,
      userAgent: session.userAgent,
      ipAddress: session.ipAddress,
    };
  }
}
