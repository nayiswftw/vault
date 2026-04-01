import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
  Logger,
} from '@nestjs/common';
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

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login and get access token' })
  @ApiOkResponse({ type: LoginResponseDto, description: 'Successful login' })
  async login(@Body() loginDto: LoginDto): Promise<LoginResponseDto> {
    this.logger.log('login called');
    return await this.authService.login(loginDto);
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
}
