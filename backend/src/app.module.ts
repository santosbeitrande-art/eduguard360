import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ListingsModule } from './modules/listings/listings.module';
import { ReservationsModule } from './modules/reservations/reservations.module';
import { EnterpriseModule } from './modules/enterprise/enterprise.module';
import { Building360Module } from './modules/building360/building360.module';
import { DatabaseConfig } from './config/database.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRoot(DatabaseConfig),
    AuthModule,
    UsersModule,
    ListingsModule,
    ReservationsModule,
    EnterpriseModule,
    Building360Module,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
