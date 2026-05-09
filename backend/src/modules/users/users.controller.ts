import { Controller, Get, Put, Param, Body, UseGuards, Request, Query } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get(':id')
  async getProfile(@Param('id') userId: string) {
    return this.usersService.getProfile(userId);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async updateProfile(@Param('id') userId: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.updateProfile(userId, updateUserDto);
  }

  @Get(':id/ratings')
  async getUserRatings(
    @Param('id') userId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.usersService.getUserRatings(userId, page, limit);
  }
}
