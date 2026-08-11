import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  getHealth() {
    return {
      ok: true,
      service: 'eduguard360-business-api',
      timestamp: new Date().toISOString(),
    };
  }
}