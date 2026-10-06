import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserRole, UserStatus } from '@prisma/client';
import { userSafeSelect, userWithInstitutionSelect, userAuthSelect, userWithPasswordSelect } from '../common/prisma/selects';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 12);

    return this.prisma.user.create({
      data: {
        ...createUserDto,
        password: hashedPassword,
        role: createUserDto.role || UserRole.NORMAL_USER,
        status: UserStatus.PENDING_VERIFICATION,
      },
      select: userSafeSelect,
    });
  }

  async findAll() {
    return this.prisma.user.findMany({
      select: userSafeSelect,
    });
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: userWithInstitutionSelect,
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  async findByIdForAuth(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: userAuthSelect,
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email }, select: userSafeSelect });
  }

  async findByEmailWithPassword(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      select: userWithPasswordSelect,
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    await this.findById(id);

    const data: any = { ...updateUserDto };
    if (updateUserDto.password) {
      data.password = await bcrypt.hash(updateUserDto.password, 12);
    }

    return this.prisma.user.update({
      where: { id },
      data,
      select: userSafeSelect,
    });
  }

  async updateRefreshToken(id: string, refreshToken: string | null) {
    await this.prisma.user.update({
      where: { id },
      data: { refreshToken },
    });
  }

  async updateLastLogin(id: string) {
    await this.prisma.user.update({
      where: { id },
      data: { lastLoginAt: new Date() },
    });
  }

  async remove(id: string) {
    await this.findById(id);
    await this.prisma.user.delete({ where: { id } });
  }

  async changeStatus(id: string, status: UserStatus) {
    await this.findById(id);
    return this.prisma.user.update({
      where: { id },
      data: { status },
      select: userSafeSelect,
    });
  }

  async changeRole(id: string, role: UserRole) {
    await this.findById(id);
    return this.prisma.user.update({
      where: { id },
      data: { role },
      select: userSafeSelect,
    });
  }

  async enableTwoFactor(id: string, secret: string) {
    await this.findById(id);
    return this.prisma.user.update({
      where: { id },
      data: { twoFactorSecret: secret, twoFactorEnabled: true },
      select: userSafeSelect,
    });
  }

  async disableTwoFactor(id: string) {
    await this.findById(id);
    return this.prisma.user.update({
      where: { id },
      data: { twoFactorSecret: null, twoFactorEnabled: false },
      select: userSafeSelect,
    });
  }
}