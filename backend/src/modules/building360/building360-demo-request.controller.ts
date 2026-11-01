import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Building360DemoRequestService } from './building360-demo-request.service';
import { CreateDemoRequestDto } from './dto/create-demo-request.dto';

@Controller('building360/public')
@UseGuards(ThrottlerGuard)
export class Building360DemoRequestPublicController {
  constructor(private readonly requestService: Building360DemoRequestService) {}

  @Post('demo-requests')
  @HttpCode(HttpStatus.ACCEPTED)
  submit(@Body() body: CreateDemoRequestDto) {
    return this.requestService.submit(body);
  }
}
