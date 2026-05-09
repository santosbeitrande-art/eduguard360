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

@Controller('reservations')
export class ReservationsController {
  constructor(private reservationsService: ReservationsService) {}

  @Post('listings/:listingId/reserve')
  @UseGuards(JwtAuthGuard)
  async createReservation(@Param('listingId') listingId: string, @Request() req) {
    return this.reservationsService.createReservation(listingId, req.user.sub);
  }

  @Post(':id/cancel')
  @UseGuards(JwtAuthGuard)
  async cancelReservation(@Param('id') id: string, @Request() req) {
    return this.reservationsService.cancelReservation(id, req.user.sub);
  }

  @Post(':id/complete')
  @UseGuards(JwtAuthGuard)
  async completeReservation(@Param('id') id: string, @Request() req) {
    return this.reservationsService.completeReservation(id, req.user.sub);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async getReservations(
    @Query('role') role: string = 'buyer',
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Request() req,
  ) {
    return this.reservationsService.getReservations(req.user.sub, role, page, limit);
  }
}
