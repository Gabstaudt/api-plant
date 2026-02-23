import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const userSelect = {
  id: true,
  fullName: true,
  email: true,
  role: true,
  status: true,
  lastLoginAt: true,
  roleProfileId: true,
  roleProfile: { select: { id: true, name: true } },
  createdAt: true,
};

@Injectable()
export class EcosystemsService {
  constructor(private prisma: PrismaService) {}

  private async getUserEcosystem(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { ecosystemId: true },
    });
    if (!user?.ecosystemId) throw new NotFoundException('Ecossistema nÃ£o encontrado');
    return user.ecosystemId;
  }

  async getMyEcosystem(userId: number) {
    const ecosystemId = await this.getUserEcosystem(userId);
    const ecosystem = await this.prisma.ecosystem.findUnique({
      where: { id: ecosystemId },
      select: { id: true, name: true, code: true, createdAt: true },
    });
    if (!ecosystem) throw new NotFoundException('Ecossistema nÃ£o encontrado');
    return ecosystem;
  }

  async listUsers(userId: number) {
    const ecosystemId = await this.getUserEcosystem(userId);
    return this.prisma.user.findMany({
      where: { ecosystemId, NOT: [{ status: 'PENDENTE' }, { status: 'DELETADO' }] },
      select: userSelect,
      orderBy: { createdAt: 'desc' },
    });
  }

  async listRequests(userId: number) {
    const ecosystemId = await this.getUserEcosystem(userId);
    return this.prisma.user.findMany({
      where: { ecosystemId, status: 'PENDENTE' },
      select: { ...userSelect, requestedRole: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async approveRequest(adminId: number, requestUserId: number, role?: 'ADMIN' | 'VIEWER') {
    const ecosystemId = await this.getUserEcosystem(adminId);
    const user = await this.prisma.user.findUnique({
      where: { id: requestUserId },
      select: { id: true, ecosystemId: true, status: true, requestedRole: true },
    });
    if (!user || user.ecosystemId !== ecosystemId) {
      throw new NotFoundException('SolicitaÃ§Ã£o nÃ£o encontrada');
    }
    if (user.status !== 'PENDENTE') {
      throw new BadRequestException('SolicitaÃ§Ã£o jÃ¡ foi processada');
    }
    const roleToSet = role ?? (user.requestedRole as 'ADMIN' | 'VIEWER' | null) ?? 'VIEWER';
    let defaultProfile = await this.prisma.roleProfile.findFirst({
      where: { ecosystemId, isDefault: true },
      select: { id: true },
    });
    if (!defaultProfile) {
      await this.prisma.roleProfile.createMany({
        data: [
          {
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
          },
          {
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
          },
        ],
      });
      defaultProfile = await this.prisma.roleProfile.findFirst({
        where: { ecosystemId, isDefault: true },
        select: { id: true },
      });
    }
    const defaultProfileId = defaultProfile?.id;
    if (!defaultProfileId) {
      throw new NotFoundException('Perfil padrão não encontrado');
    }
    return this.prisma.user.update({
      where: { id: requestUserId },
      data: {
        status: 'ATIVO',
        role: roleToSet,
        requestedRole: null,
        roleProfileId: defaultProfileId,
      },
      select: userSelect,
    });
  }

  async rejectRequest(adminId: number, requestUserId: number) {
    const ecosystemId = await this.getUserEcosystem(adminId);
    const user = await this.prisma.user.findUnique({
      where: { id: requestUserId },
      select: { id: true, ecosystemId: true, status: true },
    });
    if (!user || user.ecosystemId !== ecosystemId) {
      throw new NotFoundException('Solicitação não encontrada');
    }
    if (user.status !== 'PENDENTE') {
      throw new BadRequestException('Solicitação já foi processada');
    }
    return this.prisma.user.update({
      where: { id: requestUserId },
      data: { status: 'BLOQUEADO' },
      select: userSelect,
    });
  }

  async updateUserRole(adminId: number, targetUserId: number, role: 'ADMIN' | 'VIEWER') {
    const ecosystemId = await this.getUserEcosystem(adminId);
    const user = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, ecosystemId: true, status: true, role: true },
    });
    if (!user || user.ecosystemId !== ecosystemId) {
      throw new NotFoundException('Usuário não encontrado');
    }
    if (user.status !== 'ATIVO') {
      throw new BadRequestException('Usuário não está ativo');
    }
    if (user.role === 'ADMIN_MASTER') {
      throw new BadRequestException('Não é possível alterar o administrador master');
    }
    return this.prisma.user.update({
      where: { id: targetUserId },
      data: { role },
      select: userSelect,
    });
  }

  async updateUserProfile(adminId: number, targetUserId: number, roleProfileId: number | null) {
    const ecosystemId = await this.getUserEcosystem(adminId);
    const user = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, ecosystemId: true, status: true },
    });
    if (!user || user.ecosystemId !== ecosystemId) {
      throw new NotFoundException('Usuário não encontrado');
    }
    if (user.status !== 'ATIVO') {
      throw new BadRequestException('Usuário não está ativo');
    }
    if (roleProfileId) {
      const profile = await this.prisma.roleProfile.findFirst({
        where: { id: roleProfileId, ecosystemId },
        select: { id: true },
      });
      if (!profile) throw new NotFoundException('Perfil não encontrado');
    }
    return this.prisma.user.update({
      where: { id: targetUserId },
      data: { roleProfileId },
      select: userSelect,
    });
  }

  async updateUserStatus(
    adminId: number,
    targetUserId: number,
    status: 'ATIVO' | 'BLOQUEADO',
  ) {
    const ecosystemId = await this.getUserEcosystem(adminId);
    const user = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, ecosystemId: true, role: true, status: true },
    });
    if (!user || user.ecosystemId !== ecosystemId) {
      throw new NotFoundException('Usuário não encontrado');
    }
    if (user.role === 'ADMIN_MASTER') {
      throw new BadRequestException('Não é possível alterar o administrador master');
    }
    if (user.status === 'DELETADO') {
      throw new BadRequestException('Usuário excluído');
    }
    return this.prisma.user.update({
      where: { id: targetUserId },
      data: { status },
      select: userSelect,
    });
  }

  async deleteUser(adminId: number, targetUserId: number) {
    const ecosystemId = await this.getUserEcosystem(adminId);
    const user = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, ecosystemId: true, role: true },
    });
    if (!user || user.ecosystemId !== ecosystemId) {
      throw new NotFoundException('Usuário não encontrado');
    }
    if (user.role === 'ADMIN_MASTER') {
      throw new BadRequestException('Não é possível excluir o administrador master');
    }
    await this.prisma.user.update({
      where: { id: targetUserId },
      data: { status: 'DELETADO' },
    });
    return { deleted: true };
  }
}
