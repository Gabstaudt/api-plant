import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const userSelect = {
  id: true,
  fullName: true,
  email: true,
  role: true,
  status: true,
  lastLoginAt: true,
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
      where: { ecosystemId, NOT: { status: 'PENDENTE' } },
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
    return this.prisma.user.update({
      where: { id: requestUserId },
      data: { status: 'ATIVO', role: roleToSet, requestedRole: null },
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
      throw new NotFoundException('SolicitaÃ§Ã£o nÃ£o encontrada');
    }
    if (user.status !== 'PENDENTE') {
      throw new BadRequestException('SolicitaÃ§Ã£o jÃ¡ foi processada');
    }
    return this.prisma.user.update({
      where: { id: requestUserId },
      data: { status: 'BLOQUEADO' },
      select: userSelect,
    });
  }
}
