import { Module } from '@nestjs/common';
import { EcosystemsController } from './ecosystems.controller';
import { EcosystemsService } from './ecosystems.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [EcosystemsController],
  providers: [EcosystemsService],
})
export class EcosystemsModule {}
