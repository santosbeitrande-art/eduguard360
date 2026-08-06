import { Controller, Get, Put, Param, Body, UseGuards, Request, Query } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { UpdateUserDto } from './dto/update-user.dto';
import { EnterpriseRbacGuard } from '../enterprise/guards/enterprise-rbac.guard';
import { RequireEnterprisePermission } from '../enterprise/decorators/enterprise-permission.decorator';

const scopeFromRequest = (req: any) => req?.enterprisePrincipal || {};

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get(':id')
  @UseGuards(JwtAuthGuard, EnterpriseRbacGuard)
  @RequireEnterprisePermission('users', 'read')
  async getProfile(@Param('id') userId: string, @Request() req: any) {
    return this.usersService.getProfile(userId, scopeFromRequest(req));
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, EnterpriseRbacGuard)
  @RequireEnterprisePermission('users', 'update')
  async updateProfile(@Param('id') userId: string, @Body() updateUserDto: UpdateUserDto, @Request() req: any) {
    return this.usersService.updateProfile(userId, updateUserDto, scopeFromRequest(req));
  }

  @Get(':id/ratings')
  @UseGuards(JwtAuthGuard, EnterpriseRbacGuard)
  @RequireEnterprisePermission('users', 'read')
  async getUserRatings(
    @Param('id') userId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Request() req: any,
  ) {
    return this.usersService.getUserRatings(userId, page, limit, scopeFromRequest(req));
  }
}
