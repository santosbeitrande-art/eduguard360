import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Controller('health')
export class HealthController {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  @Get()
  getHealth() {
    return {
      ok: true,
      service: 'eduguard360-business-api',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('ready')
  async getReadiness() {
    const requiredVariables = [
      'DATABASE_URL',
      'JWT_SECRET',
      'JWT_REFRESH_SECRET',
      'SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY',
    ];
    const missingVariables = requiredVariables.filter((name) => !String(process.env[name] || '').trim());
    const supabaseUrl = String(process.env.SUPABASE_URL || '').trim();
    const inviteRedirectUrl = String(
      process.env.BUILDING360_INVITE_REDIRECT_URL
      || 'https://eduguard360.co.mz/auth/recovery?returnTo=%2Fbuilding360%2Fdashboard&mode=update-password',
    ).trim();

    try {
      if (supabaseUrl && new URL(supabaseUrl).protocol !== 'https:') missingVariables.push('SUPABASE_URL (HTTPS required)');
      if (new URL(inviteRedirectUrl).protocol !== 'https:') {
        missingVariables.push('BUILDING360_INVITE_REDIRECT_URL (HTTPS required)');
      }
    } catch {
      missingVariables.push('SUPABASE_URL or BUILDING360_INVITE_REDIRECT_URL (invalid URL)');
    }

    if (missingVariables.length) {
      throw new ServiceUnavailableException({
        status: 'not_ready',
        missingConfiguration: [...new Set(missingVariables)],
      });
    }

    try {
      await this.dataSource.query('SELECT 1');
    } catch (error) {
      throw new ServiceUnavailableException(
        { status: 'not_ready', dependency: 'database' },
        { cause: error },
      );
    }

    return {
      ok: true,
      service: 'eduguard360-business-api',
      ready: true,
      timestamp: new Date().toISOString(),
    };
  }
}