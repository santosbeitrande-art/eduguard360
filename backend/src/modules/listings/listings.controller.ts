import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { ListingsService } from './listings.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CreateListingDto } from './dto/create-listing.dto';
import { UpdateListingDto } from './dto/update-listing.dto';
import { EnterpriseRbacGuard } from '../enterprise/guards/enterprise-rbac.guard';
import { RequireEnterprisePermission } from '../enterprise/decorators/enterprise-permission.decorator';

const scopeFromRequest = (req: any) => req?.enterprisePrincipal || {};

@Controller('listings')
export class ListingsController {
  constructor(private listingsService: ListingsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, EnterpriseRbacGuard)
  @RequireEnterprisePermission('courses', 'create')
  async createListing(@Body() createListingDto: CreateListingDto, @Request() req: any) {
    return this.listingsService.createListing(req.user.sub, createListingDto, scopeFromRequest(req));
  }

  @Get()
  @UseGuards(JwtAuthGuard, EnterpriseRbacGuard)
  @RequireEnterprisePermission('courses', 'read')
  async getListings(
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('minPrice') minPrice?: number,
    @Query('maxPrice') maxPrice?: number,
    @Query('latitude') latitude?: number,
    @Query('longitude') longitude?: number,
    @Query('radius') radius?: number,
    @Query('sortBy') sortBy?: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Request() req?: any,
  ) {
    const filters = {
      type,
      status,
      minPrice,
      maxPrice,
      latitude,
      longitude,
      radius,
      sortBy,
    };

    return this.listingsService.getListings(filters, page, limit, scopeFromRequest(req));
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, EnterpriseRbacGuard)
  @RequireEnterprisePermission('courses', 'read')
  async getListingById(@Param('id') id: string, @Request() req: any) {
    return this.listingsService.getListingById(id, scopeFromRequest(req));
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, EnterpriseRbacGuard)
  @RequireEnterprisePermission('courses', 'update')
  async updateListing(
    @Param('id') id: string,
    @Body() updateListingDto: UpdateListingDto,
    @Request() req: any,
  ) {
    return this.listingsService.updateListing(req.user.sub, id, updateListingDto, scopeFromRequest(req));
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, EnterpriseRbacGuard)
  @RequireEnterprisePermission('courses', 'delete')
  async deleteListing(@Param('id') id: string, @Request() req: any) {
    await this.listingsService.deleteListing(req.user.sub, id, scopeFromRequest(req));
    return { success: true };
  }
}
