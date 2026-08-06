import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Rating } from './entities/rating.entity';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { EnterpriseRbacGuard } from '../enterprise/guards/enterprise-rbac.guard';

@Module({
  imports: [TypeOrmModule.forFeature([User, Rating])],
  providers: [UsersService, EnterpriseRbacGuard],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
