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

@Controller('listings')
export class ListingsController {
  constructor(private listingsService: ListingsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async createListing(@Body() createListingDto: CreateListingDto, @Request() req) {
    return this.listingsService.createListing(req.user.sub, createListingDto);
  }

  @Get()
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

    return this.listingsService.getListings(filters, page, limit);
  }

  @Get(':id')
  async getListingById(@Param('id') id: string) {
    return this.listingsService.getListingById(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async updateListing(
    @Param('id') id: string,
    @Body() updateListingDto: UpdateListingDto,
    @Request() req,
  ) {
    return this.listingsService.updateListing(req.user.sub, id, updateListingDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async deleteListing(@Param('id') id: string, @Request() req) {
    await this.listingsService.deleteListing(req.user.sub, id);
    return { success: true };
  }
}
