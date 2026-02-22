import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { PlantsModule } from './modules/plants/plants.module';
import { SensorsModule } from './modules/sensors/sensors.module';
import { AlertsModule } from './modules/alerts/alerts.module';
import { EcosystemsModule } from './modules/ecosystems/ecosystems.module';
import { RolesModule } from './modules/roles/roles.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    PlantsModule,
    SensorsModule,
    AlertsModule,
    EcosystemsModule,
    RolesModule,
  ],
})
export class AppModule {}
