import { Controller, Get, Param, ParseUUIDPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RequireEnterprisePermission } from '../enterprise/decorators/enterprise-permission.decorator';
import { EnterpriseRbacGuard } from '../enterprise/guards/enterprise-rbac.guard';
import { Building360DemoRequestService } from './building360-demo-request.service';

const actorFromRequest = (request: any) => request?.enterprisePrincipal || {};

@Controller('building360/admin/demo-requests')
@UseGuards(JwtAuthGuard, EnterpriseRbacGuard)
export class Building360DemoRequestAdminController {
  constructor(private readonly requestService: Building360DemoRequestService) {}

  @Get()
  @RequireEnterprisePermission('users', 'read')
  list(@Req() request: any, @Query('status') status?: string) {
    return this.requestService.list(status, actorFromRequest(request));
  }

  @Post(':id/approve')
  @RequireEnterprisePermission('users', 'approve')
  approve(@Req() request: any, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.requestService.approve(id, actorFromRequest(request));
  }

  @Post(':id/reject')
  @RequireEnterprisePermission('users', 'approve')
  reject(@Req() request: any, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.requestService.reject(id, actorFromRequest(request));
  }
}
