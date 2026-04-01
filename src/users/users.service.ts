import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../prisma/generated/client';
import { compare, hash } from 'bcryptjs';
import { Role } from '../common/enums/role.enum';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';

type DbUser = {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<AuthenticatedUser[]> {
    const users = await this.prisma.user.findMany({
      orderBy: {
        createdAt: 'asc',
      },
    });

    return users.map((user) => this.toPublicUser(this.toInternalUser(user)));
  }

  async findByIdOrThrow(userId: string): Promise<AuthenticatedUser> {
    const user = await this.findInternalById(userId);
    if (!user) {
      throw new NotFoundException('User was not found.');
    }

    return this.toPublicUser(user);
  }

  async findInternalById(userId: string): Promise<User | undefined> {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    return user ? this.toInternalUser(user) : undefined;
  }

  async findInternalByEmail(email: string): Promise<User | undefined> {
    const normalizedEmail = this.normalizeEmail(email);
    const user = await this.prisma.user.findUnique({
      where: {
        email: normalizedEmail,
      },
    });

    return user ? this.toInternalUser(user) : undefined;
  }

  async create(createUserDto: CreateUserDto): Promise<AuthenticatedUser> {
    const existingUser = await this.findInternalByEmail(createUserDto.email);
    if (existingUser) {
      throw new ConflictException('A user with this email already exists.');
    }

    const user = await this.prisma.user.create({
      data: {
        name: createUserDto.name,
        email: this.normalizeEmail(createUserDto.email),
        passwordHash: await hash(createUserDto.password, 10),
        role: this.toDbRole(createUserDto.role ?? Role.Viewer),
        isActive: createUserDto.isActive ?? true,
      },
    });

    return this.toPublicUser(this.toInternalUser(user));
  }

  async update(
    userId: string,
    updateUserDto: UpdateUserDto,
  ): Promise<AuthenticatedUser> {
    const user = await this.findInternalById(userId);
    if (!user) {
      throw new NotFoundException('User was not found.');
    }

    if (updateUserDto.email) {
      const conflictingUser = await this.findInternalByEmail(
        updateUserDto.email,
      );
      if (conflictingUser && conflictingUser.id !== user.id) {
        throw new ConflictException('A user with this email already exists.');
      }
    }

    const data: Prisma.UserUpdateInput = {};

    if (updateUserDto.name !== undefined) {
      data.name = updateUserDto.name;
    }

    if (updateUserDto.email !== undefined) {
      data.email = this.normalizeEmail(updateUserDto.email);
    }

    if (updateUserDto.role !== undefined) {
      data.role = this.toDbRole(updateUserDto.role);
    }

    if (updateUserDto.isActive !== undefined) {
      data.isActive = updateUserDto.isActive;
    }

    if (updateUserDto.password !== undefined) {
      data.passwordHash = await hash(updateUserDto.password, 10);
    }

    const updatedUser = await this.prisma.user.update({
      where: {
        id: userId,
      },
      data,
    });

    return this.toPublicUser(this.toInternalUser(updatedUser));
  }

  async remove(userId: string): Promise<{ deletedUserId: string }> {
    const existingUser = await this.findInternalById(userId);
    if (!existingUser) {
      throw new NotFoundException('User was not found.');
    }

    await this.prisma.user.delete({
      where: {
        id: userId,
      },
    });

    return { deletedUserId: userId };
  }

  async validateCredentials(
    email: string,
    password: string,
  ): Promise<User | null> {
    const user = await this.findInternalByEmail(email);
    if (!user) {
      return null;
    }

    const isPasswordValid = await compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return null;
    }

    return user;
  }

  toPublicUser(user: User): AuthenticatedUser {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private toInternalUser(dbUser: DbUser): User {
    return {
      id: dbUser.id,
      name: dbUser.name,
      email: dbUser.email,
      passwordHash: dbUser.passwordHash,
      role: this.toAppRole(dbUser.role),
      isActive: dbUser.isActive,
      createdAt: dbUser.createdAt.toISOString(),
      updatedAt: dbUser.updatedAt.toISOString(),
    };
  }

  private toDbRole(role: Role): 'VIEWER' | 'ANALYST' | 'ADMIN' {
    if (role === Role.Admin) {
      return 'ADMIN';
    }

    if (role === Role.Analyst) {
      return 'ANALYST';
    }

    return 'VIEWER';
  }

  private toAppRole(role: string): Role {
    if (role === 'ADMIN') {
      return Role.Admin;
    }

    if (role === 'ANALYST') {
      return Role.Analyst;
    }

    return Role.Viewer;
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }
}
