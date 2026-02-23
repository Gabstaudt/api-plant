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
    const existing = await this.prisma.roleProfile.findMany({
      where: { ecosystemId },
      select: { id: true, name: true, isDefault: true },
    });
    const hasDefault = existing.some((p) => p.isDefault);
    const hasAdmin = existing.some((p) => p.name === 'Administrador');
    if (!hasDefault || !hasAdmin) {
      await this.prisma.roleProfile.createMany({
        data: [
          !hasDefault
            ? {
                name: 'Usuário',
                isDefault: true,
                permissions: [
                  'nav:dashboard',
                  'nav:plants',
                  'nav:sensors',
                  'nav:alerts',
                  'plants:create',
                  'plants:view:details',
                  'sensors:create',
                  'sensors:view:readings',
                  'alerts:manage',
                  'alerts:view:details',
                  'settings:view',
                ],
                ecosystemId,
              }
            : null,
          !hasAdmin
            ? {
                name: 'Administrador',
                isDefault: false,
                permissions: [
                  'nav:dashboard',
                  'nav:plants',
                  'nav:sensors',
                  'nav:alerts',
                  'nav:reports',
                  'nav:users',
                  'nav:settings',
                  'plants:create',
                  'plants:update',
                  'plants:delete',
                  'plants:view:details',
                  'sensors:create',
                  'sensors:update',
                  'sensors:delete',
                  'sensors:view:readings',
                  'sensors:view:settings',
                  'alerts:manage',
                  'alerts:resolve',
                  'alerts:view:details',
                  'reports:view',
                  'reports:export',
                  'users:manage',
                  'users:roles',
                  'settings:view',
                  'settings:update',
                ],
                ecosystemId,
              }
            : null,
        ].filter(Boolean) as any,
      });
    }
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
        isDefault: false,
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
