import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Reservation } from './entities/reservation.entity';
import { ReservationsService } from './reservations.service';
import { ReservationsController } from './reservations.controller';
import { Listing } from '../listings/entities/listing.entity';
import { EnterpriseRbacGuard } from '../enterprise/guards/enterprise-rbac.guard';

@Module({
  imports: [TypeOrmModule.forFeature([Reservation, Listing])],
  providers: [ReservationsService, EnterpriseRbacGuard],
  controllers: [ReservationsController],
  exports: [ReservationsService],
})
export class ReservationsModule {}
