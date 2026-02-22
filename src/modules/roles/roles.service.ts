import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRoleProfileDto } from './dto/create-role-profile.dto';
import { UpdateRoleProfileDto } from './dto/update-role-profile.dto';

@Injectable()
export class RolesService {
  constructor(private prisma: PrismaService) {}

  private async getEcosystemId(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { ecosystemId: true },
    });
    if (!user?.ecosystemId) {
      throw new UnauthorizedException('Usuário sem ecossistema');
    }
    return user.ecosystemId;
  }

  async list(userId: number) {
    const ecosystemId = await this.getEcosystemId(userId);
    const profiles = await this.prisma.roleProfile.findMany({
      where: { ecosystemId },
      orderBy: { createdAt: 'desc' },
    });
    return { data: profiles };
  }

  async create(userId: number, dto: CreateRoleProfileDto) {
    const ecosystemId = await this.getEcosystemId(userId);
    if (!dto.name?.trim()) {
      throw new BadRequestException('Nome do perfil é obrigatório');
    }
    return this.prisma.roleProfile.create({
      data: {
        name: dto.name.trim(),
        permissions: dto.permissions ?? [],
        ecosystem: { connect: { id: ecosystemId } },
      },
    });
  }

  async update(userId: number, id: number, dto: UpdateRoleProfileDto) {
    const ecosystemId = await this.getEcosystemId(userId);
    const existing = await this.prisma.roleProfile.findFirst({
      where: { id, ecosystemId },
    });
    if (!existing) throw new NotFoundException('Perfil não encontrado');
    return this.prisma.roleProfile.update({
      where: { id },
      data: {
        name: dto.name?.trim() ?? undefined,
        permissions: dto.permissions ?? undefined,
      },
    });
  }

  async remove(userId: number, id: number) {
    const ecosystemId = await this.getEcosystemId(userId);
    const existing = await this.prisma.roleProfile.findFirst({
      where: { id, ecosystemId },
    });
    if (!existing) throw new NotFoundException('Perfil não encontrado');
    await this.prisma.roleProfile.delete({ where: { id } });
    return { deleted: true };
  }
}
