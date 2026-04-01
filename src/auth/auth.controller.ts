import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UseGuards,
  Logger,
} from '@nestjs/common';
import type { Request } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { LoginDto } from './dto/login.dto';
import { AuthService } from './auth.service';
import { LoginResponseDto } from './dto/login-response.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import {
  RevokeAllSessionsResponseDto,
  RevokeSessionResponseDto,
  SessionsResponseDto,
} from './dto/sessions-responses.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login and get access token' })
  @ApiOkResponse({ type: LoginResponseDto, description: 'Successful login' })
  async login(
    @Body() loginDto: LoginDto,
    @Req() request: Request,
  ): Promise<LoginResponseDto> {
    this.logger.log('login called');
    return await this.authService.login(
      loginDto,
      this.getSessionMetadata(request),
    );
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate refresh token and issue new tokens' })
  @ApiOkResponse({
    type: LoginResponseDto,
    description: 'Tokens refreshed successfully',
  })
  async refresh(
    @Body() refreshTokenDto: RefreshTokenDto,
    @Req() request: Request,
  ): Promise<LoginResponseDto> {
    this.logger.log('refresh called');
    return await this.authService.refresh(
      refreshTokenDto.refreshToken,
      this.getSessionMetadata(request),
    );
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke refresh token session' })
  @ApiOkResponse({
    type: RevokeSessionResponseDto,
    description: 'Session revoked successfully',
  })
  async logout(
    @Body() refreshTokenDto: RefreshTokenDto,
  ): Promise<RevokeSessionResponseDto> {
    this.logger.log('logout called');
    return await this.authService.logout(refreshTokenDto.refreshToken);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiOkResponse({
    type: AuthenticatedUser,
    description: 'Profile retrieved successfully',
  })
  profile(@CurrentUser() user: AuthenticatedUser): AuthenticatedUser {
    this.logger.log('profile requested');
    return user;
  }

  @Get('sessions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'List active refresh-token sessions' })
  @ApiOkResponse({
    type: SessionsResponseDto,
    description: 'Active sessions retrieved successfully',
  })
  async sessions(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SessionsResponseDto> {
    this.logger.log('sessions requested');
    return await this.authService.getActiveSessions(user.id);
  }

  @Delete('sessions/:sessionId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Revoke one session by session ID' })
  @ApiOkResponse({
    type: RevokeSessionResponseDto,
    description: 'Session revoked successfully',
  })
  async revokeSession(
    @CurrentUser() user: AuthenticatedUser,
    @Param('sessionId') sessionId: string,
  ): Promise<RevokeSessionResponseDto> {
    this.logger.log('session revocation requested');
    return await this.authService.revokeSession(user.id, sessionId);
  }

  @Post('sessions/revoke-all')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Revoke all active sessions for current user' })
  @ApiOkResponse({
    type: RevokeAllSessionsResponseDto,
    description: 'All sessions revoked successfully',
  })
  async revokeAllSessions(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<RevokeAllSessionsResponseDto> {
    this.logger.log('all sessions revocation requested');
    return await this.authService.revokeAllSessions(user.id);
  }

  private getSessionMetadata(request: Request): {
    userAgent: string | null;
    ipAddress: string | null;
  } {
    const userAgent = request.get('user-agent');
    return {
      userAgent: userAgent ? userAgent.slice(0, 512) : null,
      ipAddress: request.ip ?? null,
    };
  }
}
