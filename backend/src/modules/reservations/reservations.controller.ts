import {
  Controller,
  Post,
  Get,
  Param,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { ReservationsService } from './reservations.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { EnterpriseRbacGuard } from '../enterprise/guards/enterprise-rbac.guard';
import { RequireEnterprisePermission } from '../enterprise/decorators/enterprise-permission.decorator';

const scopeFromRequest = (req: any) => req?.enterprisePrincipal || {};

@Controller('reservations')
export class ReservationsController {
  constructor(private reservationsService: ReservationsService) {}

  @Post('listings/:listingId/reserve')
  @UseGuards(JwtAuthGuard, EnterpriseRbacGuard)
  @RequireEnterprisePermission('enrollments', 'create')
  async createReservation(@Param('listingId') listingId: string, @Request() req: any) {
    return this.reservationsService.createReservation(listingId, req.user.sub, scopeFromRequest(req));
  }

  @Post(':id/cancel')
  @UseGuards(JwtAuthGuard, EnterpriseRbacGuard)
  @RequireEnterprisePermission('enrollments', 'update')
  async cancelReservation(@Param('id') id: string, @Request() req: any) {
    return this.reservationsService.cancelReservation(id, req.user.sub, scopeFromRequest(req));
  }

  @Post(':id/complete')
  @UseGuards(JwtAuthGuard, EnterpriseRbacGuard)
  @RequireEnterprisePermission('enrollments', 'approve')
  async completeReservation(@Param('id') id: string, @Request() req: any) {
    return this.reservationsService.completeReservation(id, req.user.sub, scopeFromRequest(req));
  }

  @Get()
  @UseGuards(JwtAuthGuard, EnterpriseRbacGuard)
  @RequireEnterprisePermission('enrollments', 'read')
  async getReservations(
    @Query('role') role: string = 'buyer',
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Request() req: any,
  ) {
    return this.reservationsService.getReservations(req.user.sub, role, page, limit, scopeFromRequest(req));
  }
}
