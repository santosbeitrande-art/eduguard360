import { Controller, Get, Query } from '@nestjs/common';
import { Building360Service } from './building360.service';

@Controller('building360/public')
export class Building360PublicController {
  constructor(private readonly building360Service: Building360Service) {}

  private resolveTenantId(): string {
    const normalized = String(process.env.BUILDING360_PUBLIC_TENANT_ID || 'tenant-demo-1').trim();
    return normalized || 'tenant-demo-1';
  }

  @Get('overview')
  getOverview(@Query('tenantId') _tenantId?: string) {
    const resolvedTenantId = this.resolveTenantId();
    return this.building360Service.getOverview({ tenantId: resolvedTenantId });
  }

  @Get('sites')
  getSites(
    @Query('tenantId') _tenantId?: string,
    @Query('organizationId') organizationId?: string,
    @Query('portfolioId') portfolioId?: string,
  ) {
    const resolvedTenantId = this.resolveTenantId();
    return this.building360Service.getSites({ tenantId: resolvedTenantId, organizationId, portfolioId });
  }

  @Get('buildings')
  getBuildings(
    @Query('tenantId') _tenantId?: string,
    @Query('siteId') siteId?: string,
    @Query('organizationId') organizationId?: string,
    @Query('portfolioId') portfolioId?: string,
  ) {
    const resolvedTenantId = this.resolveTenantId();
    return this.building360Service.getBuildings({
      tenantId: resolvedTenantId,
      siteId,
      organizationId,
      portfolioId,
    });
  }

  @Get('units')
  getUnits(
    @Query('tenantId') _tenantId?: string,
    @Query('siteId') siteId?: string,
    @Query('buildingId') buildingId?: string,
    @Query('type') type?: string,
    @Query('status') status?: string,
  ) {
    const resolvedTenantId = this.resolveTenantId();
    return this.building360Service.getUnits({
      tenantId: resolvedTenantId,
      siteId,
      buildingId,
      type,
      status,
    });
  }
}
