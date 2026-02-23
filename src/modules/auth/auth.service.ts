import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as argon2 from 'argon2';
import { JwtService } from '@nestjs/jwt';
import { LoginDto, RegisterDto } from '../dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwt: JwtService) {}

  private async generateEcosystemCode() {
    const prefix = 'ECO-';
    for (let i = 0; i < 5; i++) {
      const code = `${prefix}${Math.random().toString(16).slice(2, 8).toUpperCase()}`;
      const exists = await this.prisma.ecosystem.findUnique({ where: { code } });
      if (!exists) return code;
    }
    throw new BadRequestException('NÃ£o foi possÃ­vel gerar o cÃ³digo do ecossistema');
  }

  async register(dto: RegisterDto) {
    const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (exists) throw new ConflictException('E-mail jÃ¡ cadastrado');

    const hash = await argon2.hash(dto.password);
    if (dto.isMasterAdmin) {
      if (!dto.ecosystemName?.trim()) {
        throw new BadRequestException('Nome do ecossistema Ã© obrigatÃ³rio');
      }
      const code = await this.generateEcosystemCode();
      const user = await this.prisma.$transaction(async (tx) => {
        const ecosystem = await tx.ecosystem.create({
          data: { name: dto.ecosystemName!.trim(), code },
        });
        await tx.roleProfile.createMany({
          data: [
            {
              name: 'Usuário',
              isDefault: true,
              permissions: [
                'nav:dashboard',
                'nav:plants',
                'nav:sensors',
                'nav:alerts',
                'plants:view:details',
                'sensors:view:readings',
                'alerts:view:details',
                'settings:view',
              ],
              ecosystemId: ecosystem.id,
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
              ecosystemId: ecosystem.id,
            },
          ],
        });
        return tx.user.create({
          data: {
            fullName: dto.fullName,
            email: dto.email,
            password: hash,
            dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
            role: 'ADMIN_MASTER',
            status: 'ATIVO',
            ecosystemId: ecosystem.id,
          },
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
            status: true,
            ecosystemId: true,
            dateOfBirth: true,
            createdAt: true,
          },
        });
      });
      return user;
    }

    if (!dto.ecosystemCode?.trim()) {
      throw new BadRequestException('CÃ³digo do ecossistema Ã© obrigatÃ³rio');
    }
    const ecosystem = await this.prisma.ecosystem.findUnique({
      where: { code: dto.ecosystemCode.trim() },
    });
    if (!ecosystem) throw new BadRequestException('CÃ³digo do ecossistema invÃ¡lido');

    const user = await this.prisma.user.create({
      data: {
        fullName: dto.fullName,
        email: dto.email,
        password: hash,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
        role: 'VIEWER',
        requestedRole: 'VIEWER',
        status: 'PENDENTE',
        ecosystemId: ecosystem.id,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        status: true,
        ecosystemId: true,
        dateOfBirth: true,
        createdAt: true,
      },
    });
    return user;
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || !(await argon2.verify(user.password, dto.password))) {
      throw new UnauthorizedException('Credenciais invÃ¡lidas');
    }
    if (user.status !== 'ATIVO') {
      throw new UnauthorizedException('Acesso pendente de aprovaÃ§Ã£o');
    }
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
    const access_token = await this.jwt.signAsync({ sub: user.id, role: user.role });
    return { access_token };
  }
}
