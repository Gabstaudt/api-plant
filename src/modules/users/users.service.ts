import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateUserDto } from '../dto/update-user.dto';
import { ChangePasswordDto } from '../dto/change-password.dto';
import * as argon2 from 'argon2';

const userSelect = {
  id: true,
  fullName: true,
  email: true,
  role: true,
  status: true,
  dateOfBirth: true,
  lastLoginAt: true,
  ecosystemId: true,
  createdAt: true,
};

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.user.findMany({ select: userSelect });
  }

  async findOne(id: number) {
    if (!Number.isInteger(id) || id <= 0) {
      throw new BadRequestException('Id inválido');
    }
    const user = await this.prisma.user.findUnique({ where: { id }, select: userSelect });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    return user;
  }

  async update(id: number, dto: UpdateUserDto) {
    if (!Number.isInteger(id) || id <= 0) {
      throw new BadRequestException('Id inválido');
    }
    return this.prisma.user.update({
      where: { id },
      data: {
        fullName: dto.fullName,
        email: dto.email,
        role: dto.role,
        status: dto.status,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
      },
      select: userSelect,
    });
  }

  async changePassword(id: number, dto: ChangePasswordDto) {
    if (!Number.isInteger(id) || id <= 0) {
      throw new BadRequestException('Id inválido');
    }
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, password: true },
    });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    const ok = await argon2.verify(user.password, dto.currentPassword);
    if (!ok) throw new UnauthorizedException('Senha atual inválida');
    const hash = await argon2.hash(dto.newPassword);
    await this.prisma.user.update({
      where: { id },
      data: { password: hash },
    });
    return { changed: true };
  }

  async remove(id: number) {
    if (!Number.isInteger(id) || id <= 0) {
      throw new BadRequestException('Id inválido');
    }
    await this.prisma.user.delete({ where: { id } });
    return { deleted: true };
  }
}
