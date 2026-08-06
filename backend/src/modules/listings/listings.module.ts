import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Listing } from './entities/listing.entity';
import { Image } from './entities/image.entity';
import { ListingsService } from './listings.service';
import { ListingsController } from './listings.controller';
import { EnterpriseRbacGuard } from '../enterprise/guards/enterprise-rbac.guard';

@Module({
  imports: [TypeOrmModule.forFeature([Listing, Image])],
  providers: [ListingsService, EnterpriseRbacGuard],
  controllers: [ListingsController],
  exports: [ListingsService],
})
export class ListingsModule {}
