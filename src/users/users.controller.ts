import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
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
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';
import { DeleteUserResponseDto } from './dto/users-responses.dto';

@ApiTags('Users')
@ApiBearerAuth('access-token')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @Roles(Role.Admin, Role.Analyst, Role.Viewer)
  @ApiOperation({ summary: 'Get current user information' })
  @ApiOkResponse({
    type: AuthenticatedUser,
    description: 'Current user retrieved successfully',
  })
  getMe(@CurrentUser() user: AuthenticatedUser): AuthenticatedUser {
    this.logger.log('Action called');
    return user;
  }

  @Get()
  @Roles(Role.Admin)
  @ApiOperation({ summary: 'Find all users' })
  @ApiOkResponse({
    type: [AuthenticatedUser],
    description: 'All users retrieved successfully',
  })
  async findAll(): Promise<AuthenticatedUser[]> {
    this.logger.log('Action called');
    return await this.usersService.findAll();
  }

  @Post()
  @Roles(Role.Admin)
  @ApiOperation({ summary: 'Create a new user' })
  @ApiOkResponse({
    type: AuthenticatedUser,
    description: 'User created successfully',
  })
  async create(
    @Body() createUserDto: CreateUserDto,
  ): Promise<AuthenticatedUser> {
    this.logger.log('Action called');
    return await this.usersService.create(createUserDto);
  }

  @Get(':id')
  @Roles(Role.Admin)
  @ApiOperation({ summary: 'Find one user by ID' })
  @ApiOkResponse({
    type: AuthenticatedUser,
    description: 'User retrieved successfully',
  })
  async findOne(@Param('id') userId: string): Promise<AuthenticatedUser> {
    this.logger.log('Action called');
    return await this.usersService.findByIdOrThrow(userId);
  }

  @Patch(':id')
  @Roles(Role.Admin)
  @ApiOperation({ summary: 'Update a user' })
  @ApiOkResponse({
    type: AuthenticatedUser,
    description: 'User updated successfully',
  })
  async update(
    @Param('id') userId: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<AuthenticatedUser> {
    this.logger.log('Action called');
    return await this.usersService.update(userId, updateUserDto);
  }

  @Delete(':id')
  @Roles(Role.Admin)
  @ApiOperation({ summary: 'Remove a user' })
  @ApiOkResponse({
    type: DeleteUserResponseDto,
    description: 'User removed successfully',
  })
  async remove(@Param('id') userId: string): Promise<DeleteUserResponseDto> {
    this.logger.log('Action called');
    return await this.usersService.remove(userId);
  }
}
